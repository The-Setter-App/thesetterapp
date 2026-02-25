import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  fetchMessagesFromServer,
  fetchSessionsFromServer,
} from "@/components/setter-ai/lib/setterAiClientApi";
import {
  cacheSessionList,
  cacheSessionMessages,
  persistDeletedSessionTombstone,
  readDeletedSessionTombstones,
  removeDeletedSessionTombstone,
} from "@/components/setter-ai/lib/setterAiClientCacheSync";
import {
  CACHE_TTL_MS,
  type ClientChatSession,
} from "@/components/setter-ai/lib/setterAiClientConstants";
import {
  isLocalSessionId,
  mergeSessionsWithLocalMessages,
} from "@/components/setter-ai/lib/setterAiClientSessionUtils";
import {
  getCachedSetterAiMessages,
  getCachedSetterAiMessagesTimestamp,
  getCachedSetterAiSessions,
  setSetterAiLastEmail,
} from "@/lib/setterAiCache";
import type { Message } from "@/types/ai";

export async function hydrateDeletedSessionTombstones(
  email: string,
  deletedSessionIdsRef: MutableRefObject<Set<string>>,
): Promise<void> {
  deletedSessionIdsRef.current = await readDeletedSessionTombstones(email);
}

export async function markSessionAsDeleted(params: {
  sessionId: string;
  currentEmail: string | null;
  deletedSessionIdsRef: MutableRefObject<Set<string>>;
}): Promise<void> {
  const { sessionId, currentEmail, deletedSessionIdsRef } = params;
  deletedSessionIdsRef.current.add(sessionId);
  if (!currentEmail) return;
  await persistDeletedSessionTombstone(currentEmail, sessionId);
}

export async function unmarkSessionAsDeleted(params: {
  sessionId: string;
  currentEmail: string | null;
  deletedSessionIdsRef: MutableRefObject<Set<string>>;
}): Promise<void> {
  const { sessionId, currentEmail, deletedSessionIdsRef } = params;
  deletedSessionIdsRef.current.delete(sessionId);
  if (!currentEmail) return;
  await removeDeletedSessionTombstone(currentEmail, sessionId);
}

export async function persistSessionList(
  currentEmail: string | null,
  sessions: ClientChatSession[],
): Promise<void> {
  if (!currentEmail) return;
  await cacheSessionList(currentEmail, sessions);
}

export function applySessionMessages(params: {
  sessionId: string;
  messages: Message[];
  setChatSessions: Dispatch<SetStateAction<ClientChatSession[]>>;
}): void {
  const { sessionId, messages, setChatSessions } = params;
  setChatSessions((prev) =>
    prev.map((session) =>
      session.id === sessionId ? { ...session, messages } : session,
    ),
  );
}

export async function refreshSessions(params: {
  forceNetwork?: boolean;
  currentEmail: string | null;
  deletedSessionIdsRef: MutableRefObject<Set<string>>;
  hydrateDeletedSessionTombstonesFn: (email: string) => Promise<void>;
  resolvePreferredSessionIdFn: (sessions: ClientChatSession[]) => string | null;
  setCurrentEmail: Dispatch<SetStateAction<string | null>>;
  setChatSessions: Dispatch<SetStateAction<ClientChatSession[]>>;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
}): Promise<ClientChatSession[]> {
  const {
    forceNetwork = false,
    currentEmail,
    deletedSessionIdsRef,
    hydrateDeletedSessionTombstonesFn,
    resolvePreferredSessionIdFn,
    setCurrentEmail,
    setChatSessions,
    setActiveSessionId,
  } = params;

  let fallbackSessions: ClientChatSession[] = [];
  if (currentEmail) {
    await hydrateDeletedSessionTombstonesFn(currentEmail);
    const tombstonedIds = deletedSessionIdsRef.current;
    const cachedSessions = await getCachedSetterAiSessions(currentEmail);
    const filteredCachedSessions =
      cachedSessions?.filter((session) => !tombstonedIds.has(session.id)) || [];

    if (filteredCachedSessions.length > 0) {
      fallbackSessions = filteredCachedSessions;
      setChatSessions((prev) =>
        mergeSessionsWithLocalMessages(filteredCachedSessions, prev),
      );
      setActiveSessionId(resolvePreferredSessionIdFn(filteredCachedSessions));
    }
  }
  try {
    const data = await fetchSessionsFromServer();
    const safeEmail = data.currentEmail.trim().toLowerCase();
    setCurrentEmail(safeEmail);
    await setSetterAiLastEmail(safeEmail);
    await hydrateDeletedSessionTombstonesFn(safeEmail);

    const tombstonedIds = deletedSessionIdsRef.current;
    const nextSessions = (data.sessions || []).filter(
      (session) => !tombstonedIds.has(session.id),
    );
    let mergedSessions: ClientChatSession[] = nextSessions;
    setChatSessions((prev) => {
      mergedSessions = mergeSessionsWithLocalMessages(nextSessions, prev);
      return mergedSessions;
    });

    setActiveSessionId(resolvePreferredSessionIdFn(mergedSessions));

    await cacheSessionList(safeEmail, mergedSessions);
    return mergedSessions;
  } catch (error) {
    if (!forceNetwork && fallbackSessions.length > 0) {
      return fallbackSessions;
    }
    throw error;
  }
}

export async function loadSessionMessages(params: {
  sessionId: string;
  currentEmail: string | null;
  forceNetwork?: boolean;
  fromSelect?: boolean;
  activeMessageLoadRef: MutableRefObject<number>;
  chatSessionsRef: MutableRefObject<ClientChatSession[]>;
  setIsHistoryLoading: Dispatch<SetStateAction<boolean>>;
  applySessionMessagesFn: (sessionId: string, messages: Message[]) => void;
}): Promise<void> {
  const {
    sessionId,
    currentEmail,
    forceNetwork = false,
    fromSelect = false,
    activeMessageLoadRef,
    chatSessionsRef,
    setIsHistoryLoading,
    applySessionMessagesFn,
  } = params;
  if (!sessionId || !currentEmail) return;
  const loadToken = fromSelect
    ? ++activeMessageLoadRef.current
    : activeMessageLoadRef.current;
  if (fromSelect) {
    setIsHistoryLoading(true);
  }
  if (isLocalSessionId(sessionId)) {
    if (fromSelect && loadToken === activeMessageLoadRef.current) {
      setIsHistoryLoading(false);
    }
    return;
  }

  try {
    if (!forceNetwork) {
      const [cachedMessages, cachedAt] = await Promise.all([
        getCachedSetterAiMessages(currentEmail, sessionId),
        getCachedSetterAiMessagesTimestamp(currentEmail, sessionId),
      ]);
      if (cachedMessages) {
        applySessionMessagesFn(sessionId, cachedMessages);
        const isFresh = Boolean(
          cachedAt && Date.now() - cachedAt < CACHE_TTL_MS,
        );
        if (isFresh) return;
      }
    }

    const serverMessages = await fetchMessagesFromServer(sessionId);
    if (fromSelect && loadToken !== activeMessageLoadRef.current) {
      return;
    }

    const localSession = chatSessionsRef.current.find(
      (session) => session.id === sessionId,
    );
    const localMessageCount = localSession?.messages.length || 0;
    if (serverMessages.length < localMessageCount) {
      await cacheSessionMessages(
        currentEmail,
        sessionId,
        localSession?.messages || [],
      );
      return;
    }

    applySessionMessagesFn(sessionId, serverMessages);
    await cacheSessionMessages(currentEmail, sessionId, serverMessages);
  } finally {
    if (fromSelect && loadToken === activeMessageLoadRef.current) {
      setIsHistoryLoading(false);
    }
  }
}
