import type { NextRequest } from "next/server";
import { startChatStream } from "@/lib/ai/chatStream";
import {
  AiConfigurationError,
  AiUpstreamError,
  isAiAbortError,
} from "@/lib/ai/claude";
import { buildLeadConversationContextBlock } from "@/lib/inboxLeadContext";
import {
  appendSetterAiExchangeAfterStream,
  buildSetterAiModelContext,
  getSetterAiSessionById,
} from "@/lib/setterAiRepository";
import { SETTER_AI_SYSTEM_PROMPT } from "@/lib/setterAiSystemPrompt";
import {
  AccessError,
  requireInboxWorkspaceContext,
  requireWorkspaceContext,
} from "@/lib/workspace";

const MAX_MESSAGE_LENGTH = 8000;
// The most a single reply may run to.
const REPLY_MAX_TOKENS = 4096;
// How much earlier conversation and lead context is sent with each message.
const HISTORY_MESSAGE_LIMIT = 30;
const CONTEXT_MAX_CHARS = 24000;
const LEAD_CONTEXT_MESSAGE_LIMIT = 50;
const LEAD_CONTEXT_MAX_CHARS = 6500;

interface StreamRequest {
  sessionId: string;
  message: string;
  requestId: string;
  leadConversationId: string;
}

function readString(body: unknown, key: keyof StreamRequest): string {
  if (!body || typeof body !== "object") return "";
  const value: unknown = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

function isAbort(error: unknown): boolean {
  return (
    isAiAbortError(error) ||
    (error instanceof Error && error.name === "AbortError")
  );
}

// The lead's conversation, when the chat is about one. Losing it only makes
// the answer less specific, so a failure here does not stop the reply.
async function loadLeadContext(conversationId: string): Promise<string | null> {
  if (!conversationId) return null;
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
    return await buildLeadConversationContextBlock({
      ownerEmail: workspaceOwnerEmail,
      conversationId,
      messageLimit: LEAD_CONTEXT_MESSAGE_LIMIT,
      maxChars: LEAD_CONTEXT_MAX_CHARS,
    });
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let sessionEmail = "";
  try {
    const context = await requireWorkspaceContext();
    sessionEmail = context.sessionEmail;
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json().catch(() => null);
    const sessionId = readString(body, "sessionId");
    const incomingMessage = readString(body, "message");
    const requestId = readString(body, "requestId");

    if (!sessionId || !incomingMessage) {
      return Response.json(
        { error: "Invalid request payload." },
        { status: 400 },
      );
    }
    if (incomingMessage.length > MAX_MESSAGE_LENGTH) {
      return Response.json({ error: "Message is too long." }, { status: 400 });
    }

    const session = await getSetterAiSessionById(sessionEmail, sessionId);
    if (!session) {
      return Response.json({ error: "Session not found." }, { status: 404 });
    }

    const leadContextBlock = await loadLeadContext(
      readString(body, "leadConversationId") ||
        (typeof session.linkedInboxConversationId === "string"
          ? session.linkedInboxConversationId
          : ""),
    );

    const turns = await buildSetterAiModelContext(
      sessionEmail,
      sessionId,
      incomingMessage,
      {
        maxHistory: HISTORY_MESSAGE_LIMIT,
        systemPrompt: SETTER_AI_SYSTEM_PROMPT,
        leadContextBlock,
        maxTotalChars: CONTEXT_MAX_CHARS,
      },
    );

    let replyText: AsyncIterable<string>;
    try {
      replyText = await startChatStream({
        tier: "writing",
        turns,
        maxTokens: REPLY_MAX_TOKENS,
        signal: request.signal,
      });
    } catch (error) {
      if (error instanceof AiConfigurationError) {
        console.error("[SetterAiStreamAPI] AI is not configured.");
        return Response.json(
          { error: "Setter AI is not available yet." },
          { status: 503 },
        );
      }
      if (error instanceof AiUpstreamError) {
        console.error("[SetterAiStreamAPI] AI request failed:", error.message);
        return Response.json(
          {
            error: error.isSetupProblem
              ? "Setter AI is unavailable right now."
              : "Setter AI could not answer. Try again.",
          },
          { status: error.isSetupProblem ? 503 : 502 },
        );
      }
      throw error;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let assistantText = "";

        try {
          for await (const piece of replyText) {
            assistantText += piece;
            controller.enqueue(encoder.encode(piece));
          }

          if (!assistantText.trim()) {
            assistantText = "No response returned from model.";
            controller.enqueue(encoder.encode(assistantText));
          }

          await appendSetterAiExchangeAfterStream(
            sessionEmail,
            sessionId,
            incomingMessage,
            assistantText,
            requestId,
          );
          controller.close();
        } catch (error) {
          // The reader left; there is nobody to send the rest to.
          if (isAbort(error)) {
            controller.close();
            return;
          }
          console.error("[SetterAiStreamAPI] Streaming failed:", error);
          controller.error(new Error("Streaming failed"));
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[SetterAiStreamAPI] Failed to process request:", error);
    return Response.json(
      { error: "Failed to process AI request." },
      { status: 500 },
    );
  }
}
