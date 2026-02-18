import { NextRequest } from 'next/server';

type IncomingMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

function isValidMessageArray(value: unknown): value is IncomingMessage[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const role = (item as IncomingMessage).role;
    const content = (item as IncomingMessage).content;
    return (
      (role === 'user' || role === 'assistant' || role === 'system') &&
      typeof content === 'string' &&
      content.trim().length > 0
    );
  });
}

export async function POST(request: NextRequest) {
  try {
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
    if (!body || typeof body !== 'object' || !isValidMessageArray(body.messages)) {
      return Response.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const incomingMessages = body.messages as IncomingMessage[];
    const messages = incomingMessages
      .slice(-30)
      .map((msg) => ({ role: msg.role, content: msg.content.trim().slice(0, 8000) }));

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

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;

              const data = trimmed.replace(/^data:\s*/, '');
              if (data === '[DONE]') {
                controller.close();
                return;
              }

              try {
                const json = JSON.parse(data);
                const token = json?.choices?.[0]?.delta?.content;
                if (typeof token === 'string' && token.length > 0) {
                  controller.enqueue(encoder.encode(token));
                }
              } catch {
                continue;
              }
            }
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
