import type {
  MessagesResponse,
  SessionResponse,
  SessionsResponse,
} from "@/components/setter-ai/lib/setterAiClientConstants";
import type { LeadConversationSummary } from "@/types/setterAiLeadContext";

export async function fetchSessionsFromServer(): Promise<SessionsResponse> {
  const response = await fetch("/api/setter-ai/sessions", {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load sessions.");
  }
  return response.json();
}

export async function fetchMessagesFromServer(
  sessionId: string,
): Promise<MessagesResponse["messages"]> {
  const response = await fetch(
    `/api/setter-ai/sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error("Failed to load session messages.");
  }
  const data = (await response.json()) as MessagesResponse;
  return data.messages || [];
}

export async function createServerSession() {
  const response = await fetch("/api/setter-ai/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: "New Conversation" }),
  });
  if (!response.ok) return null;

  const data = (await response.json()) as SessionResponse;
  return data.session;
}

export async function streamSetterAiResponse(params: {
  sessionId: string;
  message: string;
  requestId: string;
  signal: AbortSignal;
  leadConversationId?: string | null;
}) {
  const { sessionId, message, requestId, signal, leadConversationId } = params;
  return fetch("/api/setter-ai/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      sessionId,
      message,
      requestId,
      ...(leadConversationId ? { leadConversationId } : {}),
    }),
  });
}

export async function patchSessionLinkedLead(params: {
  sessionId: string;
  lead: Pick<LeadConversationSummary, "conversationId">;
  label: string;
}) {
  const { sessionId, lead, label } = params;
  return fetch(`/api/setter-ai/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      linkedInboxConversationId: lead.conversationId,
      linkedInboxConversationLabel: label,
    }),
  });
}

export async function clearSessionLinkedLead(sessionId: string) {
  return fetch(`/api/setter-ai/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      linkedInboxConversationId: null,
      linkedInboxConversationLabel: null,
    }),
  });
}

export async function deleteSessionOnServer(sessionId: string) {
  return fetch(`/api/setter-ai/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}
