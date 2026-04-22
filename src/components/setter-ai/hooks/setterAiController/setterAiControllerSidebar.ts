import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { deleteSessionOnServer } from "@/components/setter-ai/lib/setterAiClientApi";
import { clearSessionMessagesCache } from "@/components/setter-ai/lib/setterAiClientCacheSync";
import type { ClientChatSession } from "@/components/setter-ai/lib/setterAiClientConstants";
import { isLocalSessionId } from "@/components/setter-ai/lib/setterAiClientSessionUtils";

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
  activeSessionId: string | null;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  updateBaseChatUrlFn: (mode?: "push" | "replace") => void;
}): Promise<void> {
  const {
    isStreaming,
    activeSessionId,
    setActiveSessionId,
    updateBaseChatUrlFn,
  } = params;
  if (isStreaming) return;
  if (!activeSessionId) return;
  setActiveSessionId(null);
  updateBaseChatUrlFn("push");
}

export async function handleDeleteSession(params: {
  sessionId: string;
  currentEmail: string | null;
  isStreaming: boolean;
  chatSessions: ClientChatSession[];
  activeSessionId: string | null;
  setChatSessions: Dispatch<SetStateAction<ClientChatSession[]>>;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  updateChatUrlFn: (sessionId: string, mode?: "push" | "replace") => void;
  updateBaseChatUrlFn: (mode?: "push" | "replace") => void;
  markSessionAsDeletedFn: (sessionId: string) => Promise<void>;
  unmarkSessionAsDeletedFn: (sessionId: string) => Promise<void>;
  persistSessionListFn: (sessions: ClientChatSession[]) => Promise<void>;
}): Promise<void> {
  const {
    sessionId,
    currentEmail,
    isStreaming,
    chatSessions,
    activeSessionId,
    setChatSessions,
    setActiveSessionId,
    updateChatUrlFn,
    updateBaseChatUrlFn,
    markSessionAsDeletedFn,
    unmarkSessionAsDeletedFn,
    persistSessionListFn,
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

  const nextActiveSessionId = nextSessions[0]?.id ?? null;
  setActiveSessionId(nextActiveSessionId);
  if (nextActiveSessionId) {
    updateChatUrlFn(nextActiveSessionId, "replace");
    return;
  }
  updateBaseChatUrlFn("replace");
}
