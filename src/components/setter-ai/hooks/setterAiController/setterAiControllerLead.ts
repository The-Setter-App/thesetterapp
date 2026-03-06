import type { Dispatch, SetStateAction } from "react";
import {
  clearSessionLinkedLead,
  patchSessionLinkedLead,
} from "@/components/setter-ai/lib/setterAiClientApi";
import { cacheSessionList } from "@/components/setter-ai/lib/setterAiClientCacheSync";
import type { ClientChatSession } from "@/components/setter-ai/lib/setterAiClientConstants";
import { isLocalSessionId } from "@/components/setter-ai/lib/setterAiClientSessionUtils";
import type { LeadConversationSummary } from "@/types/setterAiLeadContext";

export async function handleLinkLead(params: {
  lead: LeadConversationSummary;
  currentEmail: string | null;
  activeSession: ClientChatSession | null;
  isStreaming: boolean;
  setChatSessions: Dispatch<SetStateAction<ClientChatSession[]>>;
}): Promise<void> {
  const { lead, currentEmail, activeSession, isStreaming, setChatSessions } =
    params;
  if (!currentEmail || !activeSession || isStreaming) return;

  const sessionId = activeSession.id;
  const label = lead.name.replace(/^@/, "") || lead.conversationId;

  setChatSessions((prev) => {
    const next = prev.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            linkedInboxConversationId: lead.conversationId,
            linkedInboxConversationLabel: label,
          }
        : session,
    );
    void cacheSessionList(currentEmail, next);
    return next;
  });

  if (isLocalSessionId(sessionId)) {
    return;
  }

  try {
    const res = await patchSessionLinkedLead({
      sessionId,
      lead,
      label,
    });
    if (!res.ok) {
      throw new Error("Failed to persist linked lead.");
    }
  } catch {
    // Keep optimistic local state even if persistence fails.
  }
}

export async function handleClearLead(params: {
  currentEmail: string | null;
  activeSession: ClientChatSession | null;
  isStreaming: boolean;
  setChatSessions: Dispatch<SetStateAction<ClientChatSession[]>>;
}): Promise<void> {
  const { currentEmail, activeSession, isStreaming, setChatSessions } = params;
  if (!currentEmail || !activeSession || isStreaming) return;

  const sessionId = activeSession.id;

  setChatSessions((prev) => {
    const next = prev.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            linkedInboxConversationId: null,
            linkedInboxConversationLabel: null,
          }
        : session,
    );
    void cacheSessionList(currentEmail, next);
    return next;
  });

  if (isLocalSessionId(sessionId)) {
    return;
  }

  try {
    const res = await clearSessionLinkedLead(sessionId);
    if (!res.ok) {
      throw new Error("Failed to clear linked lead.");
    }
  } catch {
    // Keep optimistic local state even if persistence fails.
  }
}
