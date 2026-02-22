import type { ChatSession } from "@/types/ai";
import type { ClientChatSession } from "@/components/setter-ai/lib/setterAiClientConstants";

export function isPlaceholderTitle(title: string | null | undefined): boolean {
  if (!title) return true;
  return title.trim().toLowerCase() === "new conversation";
}

export function createLocalSessionId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function isLocalSessionId(sessionId: string): boolean {
  return sessionId.startsWith("local_");
}

export function isEmptyLocalDraft(
  session: ClientChatSession | null | undefined,
): boolean {
  return Boolean(session?.localOnly && (session.messages?.length || 0) === 0);
}

export function mergeSessionsWithLocalMessages(
  nextSessions: ChatSession[],
  previous: ClientChatSession[],
): ClientChatSession[] {
  const previousById = new Map(previous.map((session) => [session.id, session]));
  const mergedServerSessions = nextSessions.map((session) => {
    const existing = previousById.get(session.id);
    const nextTitle =
      existing &&
      !isPlaceholderTitle(existing.title) &&
      isPlaceholderTitle(session.title)
        ? existing.title
        : session.title;
    return {
      ...session,
      title: nextTitle,
      messages: existing?.messages || [],
    };
  });

  const pendingLocalSessions = previous.filter(
    (session) =>
      session.localOnly &&
      !mergedServerSessions.some((merged) => merged.id === session.id),
  );

  return [...pendingLocalSessions, ...mergedServerSessions];
}

export function chatPath(sessionId: string): string {
  return `/setter-ai/${encodeURIComponent(sessionId)}`;
}
