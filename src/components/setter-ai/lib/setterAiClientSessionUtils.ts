import type { ClientChatSession } from "@/components/setter-ai/lib/setterAiClientConstants";
import type { ChatSession } from "@/types/ai";

const RETAIN_MISSING_SESSIONS_MS = 5 * 60 * 1000;

export function isPlaceholderTitle(title: string | null | undefined): boolean {
  if (!title) return true;
  return title.trim().toLowerCase() === "new conversation";
}

function toTimeMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
  const previousById = new Map(
    previous.map((session) => [session.id, session]),
  );
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

  const mergedServerSessionIds = new Set(
    mergedServerSessions.map((session) => session.id),
  );
  const pendingLocalSessions = previous.filter(
    (session) => session.localOnly && !mergedServerSessionIds.has(session.id),
  );

  const nowMs = Date.now();
  const retainedMissingRecentSessions = previous.filter((session) => {
    if (session.localOnly) return false;
    if (mergedServerSessionIds.has(session.id)) return false;
    if ((session.messages?.length || 0) === 0) return false;
    const lastUpdatedMs = Math.max(
      toTimeMs(session.updatedAt),
      toTimeMs(session.createdAt),
    );
    if (!lastUpdatedMs) return false;
    return nowMs - lastUpdatedMs < RETAIN_MISSING_SESSIONS_MS;
  });

  return [
    ...pendingLocalSessions,
    ...retainedMissingRecentSessions,
    ...mergedServerSessions,
  ];
}

export function chatPath(sessionId: string): string {
  return `/setter-ai/${encodeURIComponent(sessionId)}`;
}
