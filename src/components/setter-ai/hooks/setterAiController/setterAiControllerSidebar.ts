import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { deleteSessionOnServer } from "@/components/setter-ai/lib/setterAiClientApi";
import { clearSessionMessagesCache } from "@/components/setter-ai/lib/setterAiClientCacheSync";
import type { ClientChatSession } from "@/components/setter-ai/lib/setterAiClientConstants";
import {
  isEmptyLocalDraft,
  isLocalSessionId,
} from "@/components/setter-ai/lib/setterAiClientSessionUtils";

export function handleSelectSession(params: {
  sessionId: string;
  activeSessionId: string | null;
  activeSessionIdRef: MutableRefObject<string | null>;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  updateChatUrlFn: (sessionId: string, mode?: "push" | "replace") => void;
  removeEmptyLocalDraftFn: (sessionId: string) => Promise<void>;
}): void {
  const {
    sessionId,
    activeSessionId,
    activeSessionIdRef,
    setActiveSessionId,
    updateChatUrlFn,
    removeEmptyLocalDraftFn,
  } = params;
  if (sessionId === activeSessionId) return;
  const previousActiveId = activeSessionIdRef.current;
  setActiveSessionId(sessionId);
  updateChatUrlFn(sessionId, "push");
  if (previousActiveId) {
    void removeEmptyLocalDraftFn(previousActiveId);
  }
}

export async function handleNewChat(params: {
  isStreaming: boolean;
  activeSession: ClientChatSession | null;
  prefersDraftStart: boolean;
  ensureBasePageDraftSessionFn: (
    mode?: "push" | "replace",
  ) => Promise<string | null>;
  createAndSelectLocalDraftFn: (params?: {
    mode?: "push" | "replace";
    existingSessions?: ClientChatSession[];
  }) => Promise<string | null>;
}): Promise<void> {
  const {
    isStreaming,
    activeSession,
    prefersDraftStart,
    ensureBasePageDraftSessionFn,
    createAndSelectLocalDraftFn,
  } = params;
  if (isStreaming) return;
  if (isEmptyLocalDraft(activeSession)) return;
  if (prefersDraftStart) {
    await ensureBasePageDraftSessionFn("push");
    return;
  }
  await createAndSelectLocalDraftFn({ mode: "push" });
}

export async function handleDeleteSession(params: {
  sessionId: string;
  currentEmail: string | null;
  isStreaming: boolean;
  chatSessions: ClientChatSession[];
  activeSessionId: string | null;
  setChatSessions: Dispatch<SetStateAction<ClientChatSession[]>>;
  markSessionAsDeletedFn: (sessionId: string) => Promise<void>;
  unmarkSessionAsDeletedFn: (sessionId: string) => Promise<void>;
  persistSessionListFn: (sessions: ClientChatSession[]) => Promise<void>;
  createAndSelectLocalDraftFn: (params?: {
    mode?: "push" | "replace";
    existingSessions?: ClientChatSession[];
  }) => Promise<string | null>;
}): Promise<void> {
  const {
    sessionId,
    currentEmail,
    isStreaming,
    chatSessions,
    activeSessionId,
    setChatSessions,
    markSessionAsDeletedFn,
    unmarkSessionAsDeletedFn,
    persistSessionListFn,
    createAndSelectLocalDraftFn,
  } = params;
  if (!currentEmail || isStreaming) return;
  const sessionToDelete = chatSessions.find(
    (session) => session.id === sessionId,
  );
  if (!sessionToDelete) return;

  const isDeletingActiveSession = activeSessionId === sessionId;
  await markSessionAsDeletedFn(sessionId);

  const nextSessions = chatSessions.filter(
    (session) => session.id !== sessionId,
  );
  setChatSessions(nextSessions);

  await Promise.all([
    persistSessionListFn(nextSessions),
    clearSessionMessagesCache(currentEmail, sessionId),
  ]);

  if (!isLocalSessionId(sessionId)) {
    void (async () => {
      const response = await deleteSessionOnServer(sessionId).catch(() => null);
      const deleteAccepted = Boolean(response?.ok || response?.status === 404);

      if (deleteAccepted) {
        return;
      }

      await unmarkSessionAsDeletedFn(sessionId);
      setChatSessions((prev) => {
        if (prev.some((session) => session.id === sessionToDelete.id)) {
          return prev;
        }
        const restored = [sessionToDelete, ...prev];
        void persistSessionListFn(restored);
        return restored;
      });
    })();
  }

  if (!isDeletingActiveSession) {
    return;
  }

  await createAndSelectLocalDraftFn({
    mode: "replace",
    existingSessions: nextSessions,
  });
}
