import { NextRequest } from 'next/server';
import { AccessError, requireWorkspaceContext } from '@/lib/workspace';
import {
  appendSetterAiExchangeAfterStream,
  buildSetterAiModelContext,
  getSetterAiSessionById,
} from '@/lib/setterAiRepository';

export async function POST(request: NextRequest) {
  let sessionEmail = '';
  try {
    try {
      const context = await requireWorkspaceContext();
      sessionEmail = context.sessionEmail;
    } catch (error) {
      if (error instanceof AccessError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.NVIDIA_BASE_URL;
    const apiKey = process.env.NVIDIA_API_KEY;
    const model = process.env.NVIDIA_MODEL;
    const temperatureRaw = process.env.NVIDIA_TEMPERATURE;
    const maxTokensRaw = process.env.NVIDIA_MAX_TOKENS;

    if (!baseUrl || !apiKey || !model || !temperatureRaw || !maxTokensRaw) {
      return Response.json(
        { error: 'Missing NVIDIA AI environment variables.' },
        { status: 500 }
      );
    }

    const temperature = Number(temperatureRaw);
    const maxTokens = Number(maxTokensRaw);
    if (Number.isNaN(temperature) || Number.isNaN(maxTokens)) {
      return Response.json(
        { error: 'Invalid NVIDIA AI numeric environment values.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
    const incomingMessage = typeof body?.message === 'string' ? body.message.trim() : '';
    const requestId = typeof body?.requestId === 'string' ? body.requestId.trim() : '';

    if (!sessionId || !incomingMessage) {
      return Response.json({ error: 'Invalid request payload.' }, { status: 400 });
    }
    if (incomingMessage.length > 8000) {
      return Response.json({ error: 'Message is too long.' }, { status: 400 });
    }

    const session = await getSetterAiSessionById(sessionEmail, sessionId);
    if (!session) {
      return Response.json({ error: 'Session not found.' }, { status: 404 });
    }

    const messages = await buildSetterAiModelContext(sessionEmail, sessionId, incomingMessage, 30);

    const upstreamResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        stream: true,
        messages,
      }),
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      const details = await upstreamResponse.text().catch(() => '');
      return Response.json(
        { error: 'Upstream AI request failed.', details: details.slice(0, 500) },
        { status: 502 }
      );
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const reader = upstreamResponse.body.getReader();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = '';
        let assistantText = '';
        let completed = false;

        try {
          streamLoop: while (true) {
            const { done, value } = await reader.read();
            if (done) {
              completed = true;
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;

              const data = trimmed.replace(/^data:\s*/, '');
              if (data === '[DONE]') {
                completed = true;
                break streamLoop;
              }

              try {
                const json = JSON.parse(data);
                const token = json?.choices?.[0]?.delta?.content;
                if (typeof token === 'string' && token.length > 0) {
                  assistantText += token;
                  controller.enqueue(encoder.encode(token));
                }
              } catch {
                continue;
              }
            }
          }

          if (completed) {
            if (!assistantText.trim()) {
              assistantText = 'No response returned from model.';
              controller.enqueue(encoder.encode(assistantText));
            }

            await appendSetterAiExchangeAfterStream(
              sessionEmail,
              sessionId,
              incomingMessage,
              assistantText,
              requestId
            );
          }

          controller.close();
        } catch {
          controller.error(new Error('Streaming failed'));
        } finally {
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return Response.json({ error: 'Failed to process AI request.' }, { status: 500 });
  }
}
