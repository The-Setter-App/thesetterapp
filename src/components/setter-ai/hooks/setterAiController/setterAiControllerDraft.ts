import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  cacheSessionMessages,
  clearSessionMessagesCache,
} from "@/components/setter-ai/lib/setterAiClientCacheSync";
import type { ClientChatSession } from "@/components/setter-ai/lib/setterAiClientConstants";
import {
  chatPath,
  createLocalSessionId,
  isEmptyLocalDraft,
} from "@/components/setter-ai/lib/setterAiClientSessionUtils";

export function updateChatUrl(
  sessionId: string,
  mode: "push" | "replace" = "push",
): void {
  if (typeof window === "undefined") return;
  const nextPath = chatPath(sessionId);
  if (window.location.pathname === nextPath) return;
  if (mode === "replace") {
    window.history.replaceState(window.history.state, "", nextPath);
    return;
  }
  window.history.pushState(window.history.state, "", nextPath);
}

export function createLocalDraftSession(): ClientChatSession {
  const nowIso = new Date().toISOString();
  return {
    id: createLocalSessionId(),
    title: "New Conversation",
    createdAt: nowIso,
    updatedAt: nowIso,
    messages: [],
    localOnly: true,
  };
}

export async function removeEmptyLocalDraft(params: {
  sessionId: string;
  currentEmail: string | null;
  chatSessionsRef: MutableRefObject<ClientChatSession[]>;
  setChatSessions: Dispatch<SetStateAction<ClientChatSession[]>>;
  persistSessionList: (sessions: ClientChatSession[]) => Promise<void>;
}): Promise<void> {
  const {
    sessionId,
    currentEmail,
    chatSessionsRef,
    setChatSessions,
    persistSessionList,
  } = params;

  const session = chatSessionsRef.current.find((item) => item.id === sessionId);
  if (!session || !session.localOnly || session.messages.length > 0) return;

  const nextSessions = chatSessionsRef.current.filter(
    (item) => item.id !== sessionId,
  );
  chatSessionsRef.current = nextSessions;
  setChatSessions(nextSessions);

  if (!currentEmail) return;
  await Promise.all([
    persistSessionList(nextSessions),
    clearSessionMessagesCache(currentEmail, sessionId),
  ]);
}

export async function createAndSelectLocalDraft(params: {
  mode?: "push" | "replace";
  existingSessions?: ClientChatSession[];
  currentEmail: string | null;
  chatSessionsRef: MutableRefObject<ClientChatSession[]>;
  setChatSessions: Dispatch<SetStateAction<ClientChatSession[]>>;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  persistSessionList: (sessions: ClientChatSession[]) => Promise<void>;
}): Promise<string | null> {
  const {
    mode,
    existingSessions,
    currentEmail,
    chatSessionsRef,
    setChatSessions,
    setActiveSessionId,
    setSearchTerm,
    persistSessionList,
  } = params;

  const localSession = createLocalDraftSession();
  const baseSessions = existingSessions ?? chatSessionsRef.current;
  const nextSessions = [localSession, ...baseSessions];

  chatSessionsRef.current = nextSessions;
  setChatSessions(nextSessions);
  setActiveSessionId(localSession.id);
  setSearchTerm("");

  if (currentEmail) {
    await Promise.all([
      persistSessionList(nextSessions),
      cacheSessionMessages(currentEmail, localSession.id, []),
    ]);
  }

  if (mode) {
    updateChatUrl(localSession.id, mode);
  }

  return localSession.id;
}

export async function ensureBasePageDraftSession(params: {
  mode?: "push" | "replace";
  prefersDraftStart: boolean;
  activeSessionIdRef: MutableRefObject<string | null>;
  chatSessionsRef: MutableRefObject<ClientChatSession[]>;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  ensuringDraftRef: MutableRefObject<boolean>;
  createAndSelectLocalDraftFn: (params?: {
    mode?: "push" | "replace";
    existingSessions?: ClientChatSession[];
  }) => Promise<string | null>;
}): Promise<string | null> {
  const {
    mode = "replace",
    prefersDraftStart,
    activeSessionIdRef,
    chatSessionsRef,
    setActiveSessionId,
    ensuringDraftRef,
    createAndSelectLocalDraftFn,
  } = params;

  if (!prefersDraftStart) {
    return null;
  }

  const currentActiveId = activeSessionIdRef.current;
  const currentActive = currentActiveId
    ? chatSessionsRef.current.find((session) => session.id === currentActiveId)
    : null;

  if (isEmptyLocalDraft(currentActive)) {
    if (currentActiveId) {
      updateChatUrl(currentActiveId, mode);
    }
    return currentActiveId;
  }

  const existingEmptyDraft = chatSessionsRef.current.find((session) =>
    isEmptyLocalDraft(session),
  );
  if (existingEmptyDraft) {
    setActiveSessionId(existingEmptyDraft.id);
    updateChatUrl(existingEmptyDraft.id, mode);
    return existingEmptyDraft.id;
  }

  if (ensuringDraftRef.current) {
    return null;
  }

  ensuringDraftRef.current = true;
  try {
    return await createAndSelectLocalDraftFn({ mode });
  } finally {
    ensuringDraftRef.current = false;
  }
}

export function resolvePreferredSessionId(params: {
  sessions: ClientChatSession[];
  activeSessionIdRef: MutableRefObject<string | null>;
  initialChatId: string | null;
  prefersDraftStart: boolean;
  pathname: string;
}): string | null {
  const {
    sessions,
    activeSessionIdRef,
    initialChatId,
    prefersDraftStart,
    pathname,
  } = params;
  const currentActiveId = activeSessionIdRef.current;
  if (
    currentActiveId &&
    sessions.some((session) => session.id === currentActiveId)
  ) {
    return currentActiveId;
  }

  if (
    initialChatId &&
    sessions.some((session) => session.id === initialChatId)
  ) {
    return initialChatId;
  }

  if (prefersDraftStart && pathname === "/setter-ai") {
    return null;
  }

  return sessions[0]?.id ?? null;
}
