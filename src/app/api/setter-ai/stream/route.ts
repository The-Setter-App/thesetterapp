import { NextRequest } from 'next/server';
import {
  AccessError,
  requireInboxWorkspaceContext,
  requireWorkspaceContext,
} from '@/lib/workspace';
import {
  appendSetterAiExchangeAfterStream,
  buildSetterAiModelContext,
  getSetterAiSessionById,
} from '@/lib/setterAiRepository';
import { SETTER_AI_SYSTEM_PROMPT } from '@/lib/setterAiSystemPrompt';
import { buildLeadConversationContextBlock } from '@/lib/inboxLeadContext';

function looksLikeSystemRoleUnsupported(details: string): boolean {
  const normalized = details.toLowerCase();
  return (
    normalized.includes("system") &&
    (normalized.includes("role") ||
      normalized.includes("unsupported") ||
      normalized.includes("must be at the beginning"))
  );
}

function looksLikeContextLengthError(details: string): boolean {
  const normalized = details.toLowerCase();
  return (
    normalized.includes("context") ||
    normalized.includes("maximum") ||
    normalized.includes("max") ||
    normalized.includes("token") ||
    normalized.includes("too long") ||
    normalized.includes("length")
  );
}

function looksLikeHtmlEdgeResponse(details: string): boolean {
  const normalized = details.toLowerCase();
  return (
    normalized.includes("<!doctype html") ||
    normalized.includes("<html") ||
    normalized.includes("</html>") ||
    normalized.includes("cloudflare") ||
    normalized.includes("access denied")
  );
}

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function buildBaseUrlCandidates(primary: string): string[] {
  const rawCandidates = [
    primary,
    process.env.NVIDIA_BASE_URL_FALLBACK || "",
    process.env.NVIDIA_ALT_BASE_URL || "",
    "https://integrate.api.nvidia.com",
  ];

  const unique: string[] = [];
  for (const raw of rawCandidates) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const normalized = normalizeBaseUrl(trimmed);
    if (!unique.includes(normalized)) {
      unique.push(normalized);
    }
  }
  return unique;
}

function coerceSystemToUser(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const systemChunks = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content.trim())
    .filter(Boolean);
  const rest = messages.filter((m) => m.role !== 'system') as Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  if (systemChunks.length === 0) return rest;
  return [
    { role: 'user', content: `Instructions:\n${systemChunks.join("\n\n")}`.slice(0, 8000) },
    ...rest,
  ];
}

// Runtime hint: if provider/model rejects system-role format, send coerced instructions first.
let preferCoercedSystemRole = false;

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
    const leadConversationIdRaw =
      typeof body?.leadConversationId === 'string' ? body.leadConversationId.trim() : '';

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

    const effectiveLeadConversationId =
      leadConversationIdRaw ||
      (typeof session.linkedInboxConversationId === 'string'
        ? session.linkedInboxConversationId
        : '');

    let leadContextBlock: string | null = null;
    if (effectiveLeadConversationId) {
      try {
        const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
        leadContextBlock = await buildLeadConversationContextBlock({
          ownerEmail: workspaceOwnerEmail,
          conversationId: effectiveLeadConversationId,
          messageLimit: 50,
          maxChars: 6500,
        });
      } catch {
        leadContextBlock = null;
      }
    }

    const buildModelMessages = async (options: {
      maxHistory: number;
      leadContextBlock: string | null;
      maxTotalChars: number;
    }) =>
      buildSetterAiModelContext(sessionEmail, sessionId, incomingMessage, {
        maxHistory: options.maxHistory,
        systemPrompt: SETTER_AI_SYSTEM_PROMPT,
        leadContextBlock: options.leadContextBlock,
        maxTotalChars: options.maxTotalChars,
      });

    let modelMessages = await buildModelMessages({
      maxHistory: 30,
      leadContextBlock,
      maxTotalChars: 24000,
    });
    const initialMessages = preferCoercedSystemRole
      ? coerceSystemToUser(modelMessages)
      : modelMessages;

    const upstreamBodyBase = {
      model,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };
    const baseUrlCandidates = buildBaseUrlCandidates(baseUrl);
    let activeBaseUrl = baseUrlCandidates[0] || normalizeBaseUrl(baseUrl);

    const callUpstream = async (
      body: Record<string, unknown>,
    ): Promise<Response> =>
      fetch(`${activeBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream, application/json',
        },
        signal: request.signal,
        body: JSON.stringify(body),
      });

    const upstreamBody = {
      ...upstreamBodyBase,
      messages: initialMessages,
    };

    let upstreamResponse = await callUpstream(upstreamBody);

    if (!upstreamResponse.ok) {
      let details = await upstreamResponse.text().catch(() => '');

      if (looksLikeHtmlEdgeResponse(details) && baseUrlCandidates.length > 1) {
        for (const candidate of baseUrlCandidates.slice(1)) {
          activeBaseUrl = candidate;
          upstreamResponse = await callUpstream(upstreamBody);
          if (upstreamResponse.ok) break;
          details = await upstreamResponse.text().catch(() => '');
        }
      }

      if (!upstreamResponse.ok && looksLikeSystemRoleUnsupported(details)) {
        preferCoercedSystemRole = true;
        const fallbackBody = {
          ...upstreamBody,
          messages: coerceSystemToUser(modelMessages),
        };
        upstreamResponse = await callUpstream(fallbackBody);
      } else if (!upstreamResponse.ok && looksLikeContextLengthError(details)) {
        // Retry with smaller context budget.
        leadContextBlock = leadContextBlock
          ? leadContextBlock.slice(0, 3500)
          : null;
        modelMessages = await buildModelMessages({
          maxHistory: 12,
          leadContextBlock,
          maxTotalChars: 14000,
        });
        const retryBody = { ...upstreamBodyBase, messages: modelMessages };
        upstreamResponse = await callUpstream(retryBody);
      } else if (!upstreamResponse.ok && looksLikeHtmlEdgeResponse(details)) {
        // Retry with a minimal payload when upstream/proxy returns HTML edge pages.
        modelMessages = await buildModelMessages({
          maxHistory: 6,
          leadContextBlock: null,
          maxTotalChars: 8000,
        });
        const retryBody = {
          ...upstreamBodyBase,
          max_tokens: Math.min(maxTokens, 600),
          messages: modelMessages,
        };
        upstreamResponse = await callUpstream(retryBody);
      } else if (!upstreamResponse.ok) {
        return Response.json(
          { error: 'Upstream AI request failed.', details: details.slice(0, 500) },
          { status: 502 },
        );
      }
    }

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
        } catch (error) {
          const aborted =
            (error instanceof DOMException && error.name === 'AbortError') ||
            (error instanceof Error && error.name === 'AbortError');
          if (aborted) {
            controller.close();
            return;
          }
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
  } catch (error) {
    const details =
      error instanceof Error ? error.message.slice(0, 500) : "Unknown error";
    return Response.json(
      { error: 'Failed to process AI request.', details },
      { status: 500 },
    );
  }
}
