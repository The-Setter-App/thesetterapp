import type { ClientChatSession } from "@/components/setter-ai/lib/setterAiClientConstants";

export function getLinkedLead(activeSession: ClientChatSession | null): {
  conversationId: string;
  label: string;
} | null {
  if (!activeSession?.linkedInboxConversationId) return null;
  const label =
    activeSession.linkedInboxConversationLabel ||
    activeSession.linkedInboxConversationId;
  return {
    conversationId: activeSession.linkedInboxConversationId,
    label,
  };
}
