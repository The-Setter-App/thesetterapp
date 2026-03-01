import { NextRequest } from 'next/server';
import OpenAI from 'openai';
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
import { toNvidiaBaseUrlCandidates } from '@/lib/nvidiaBaseUrl';

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

function buildBaseUrlCandidates(primary: string): string[] {
  return toNvidiaBaseUrlCandidates(primary, [
    process.env.NVIDIA_BASE_URL_FALLBACK || "",
    process.env.NVIDIA_ALT_BASE_URL || "",
    "https://integrate.api.nvidia.com",
  ]);
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

function getErrorDetails(error: Error | null): string {
  if (!error) return '';
  return error.message || '';
}

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

    const baseUrlCandidates = buildBaseUrlCandidates(baseUrl);
    let activeBaseUrl = baseUrlCandidates[0] || baseUrl;
    const createStream = async (
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
      maxTokensOverride?: number,
    ) => {
      const client = new OpenAI({
        apiKey,
        baseURL: activeBaseUrl,
      });
      return client.chat.completions.create(
        {
          model,
          temperature,
          max_tokens: maxTokensOverride ?? maxTokens,
          stream: true,
          messages,
        },
        { signal: request.signal },
      );
    };

    let completionStream:
      | Awaited<ReturnType<typeof createStream>>
      | null = null;
    let details = '';

    try {
      completionStream = await createStream(initialMessages);
    } catch (error) {
      details = getErrorDetails(error instanceof Error ? error : null);
    }

    if (!completionStream && baseUrlCandidates.length > 1) {
      for (const candidate of baseUrlCandidates.slice(1)) {
        activeBaseUrl = candidate;
        try {
          completionStream = await createStream(initialMessages);
          details = '';
          break;
        } catch (error) {
          details = getErrorDetails(error instanceof Error ? error : null);
        }
      }
    }

    if (!completionStream && looksLikeSystemRoleUnsupported(details)) {
      preferCoercedSystemRole = true;
      try {
        completionStream = await createStream(coerceSystemToUser(modelMessages));
        details = '';
      } catch (error) {
        details = getErrorDetails(error instanceof Error ? error : null);
      }
    } else if (!completionStream && looksLikeContextLengthError(details)) {
      // Retry with smaller context budget.
      leadContextBlock = leadContextBlock
        ? leadContextBlock.slice(0, 3500)
        : null;
      modelMessages = await buildModelMessages({
        maxHistory: 12,
        leadContextBlock,
        maxTotalChars: 14000,
      });
      try {
        completionStream = await createStream(modelMessages);
        details = '';
      } catch (error) {
        details = getErrorDetails(error instanceof Error ? error : null);
      }
    } else if (!completionStream && looksLikeHtmlEdgeResponse(details)) {
      // Retry with a minimal payload when upstream/proxy returns HTML edge pages.
      modelMessages = await buildModelMessages({
        maxHistory: 6,
        leadContextBlock: null,
        maxTotalChars: 8000,
      });
      try {
        completionStream = await createStream(modelMessages, Math.min(maxTokens, 600));
        details = '';
      } catch (error) {
        details = getErrorDetails(error instanceof Error ? error : null);
      }
    }

    if (!completionStream) {
      return Response.json(
        { error: 'Upstream AI request failed.', details: details.slice(0, 500) },
        { status: 502 },
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let assistantText = '';
        let completed = false;

        try {
          for await (const chunk of completionStream) {
            const token = chunk.choices?.[0]?.delta?.content;
            if (typeof token === 'string' && token.length > 0) {
              assistantText += token;
              controller.enqueue(encoder.encode(token));
            }
          }
          completed = true;

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
