import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  createServerSession,
  deleteSessionOnServer,
} from "@/components/setter-ai/lib/setterAiClientApi";
import type { ClientChatSession } from "@/components/setter-ai/lib/setterAiClientConstants";
import {
  isLocalSessionId,
  isPlaceholderTitle,
} from "@/components/setter-ai/lib/setterAiClientSessionUtils";
import { replaceCachedSetterAiSessionId } from "@/lib/cache";

export async function syncLocalSessionToServer(params: {
  localSessionId: string;
  currentEmail: string | null;
  activeSessionId: string | null;
  deletedSessionIdsRef: MutableRefObject<Set<string>>;
  chatSessionsRef: MutableRefObject<ClientChatSession[]>;
  sessionSyncPromisesRef: MutableRefObject<Map<string, Promise<string | null>>>;
  setChatSessions: Dispatch<SetStateAction<ClientChatSession[]>>;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  markSessionAsDeletedFn: (sessionId: string) => Promise<void>;
  updateChatUrlFn: (sessionId: string, mode?: "push" | "replace") => void;
}): Promise<string | null> {
  const {
    localSessionId,
    currentEmail,
    activeSessionId,
    deletedSessionIdsRef,
    chatSessionsRef,
    sessionSyncPromisesRef,
    setChatSessions,
    setActiveSessionId,
    markSessionAsDeletedFn,
    updateChatUrlFn,
  } = params;
  if (!currentEmail || !isLocalSessionId(localSessionId)) {
    return localSessionId;
  }

  const existingPromise = sessionSyncPromisesRef.current.get(localSessionId);
  if (existingPromise) {
    return existingPromise;
  }

  const syncPromise = (async () => {
    if (deletedSessionIdsRef.current.has(localSessionId)) {
      return null;
    }

    const localSession = chatSessionsRef.current.find(
      (session) => session.id === localSessionId,
    );
    if (!localSession) {
      return null;
    }

    const created = await createServerSession().catch(() => null);
    if (!created) {
      if (deletedSessionIdsRef.current.has(localSessionId)) {
        return null;
      }
      setChatSessions((prev) =>
        prev.map((session) =>
          session.id === localSessionId
            ? { ...session, syncFailed: true }
            : session,
        ),
      );
      return null;
    }

    const promotedSession: ClientChatSession = {
      ...created,
      title:
        !isPlaceholderTitle(localSession.title) &&
        isPlaceholderTitle(created.title)
          ? localSession.title
          : created.title,
      messages: localSession.messages,
      linkedInboxConversationId:
        created.linkedInboxConversationId ||
        localSession.linkedInboxConversationId ||
        null,
      linkedInboxConversationLabel:
        created.linkedInboxConversationLabel ||
        localSession.linkedInboxConversationLabel ||
        null,
    };

    if (deletedSessionIdsRef.current.has(localSessionId)) {
      await markSessionAsDeletedFn(created.id);
      await deleteSessionOnServer(created.id).catch(() => null);
      return null;
    }

    setChatSessions((prev) => {
      const localIndex = prev.findIndex(
        (session) => session.id === localSessionId,
      );
      if (localIndex === -1) {
        if (prev.some((session) => session.id === promotedSession.id)) {
          return prev;
        }
        return [promotedSession, ...prev];
      }

      return prev.map((session, index) =>
        index === localIndex ? promotedSession : session,
      );
    });
    if (activeSessionId === localSessionId) {
      setActiveSessionId(promotedSession.id);
      updateChatUrlFn(promotedSession.id, "replace");
    }

    await replaceCachedSetterAiSessionId(
      currentEmail,
      localSessionId,
      promotedSession,
    );
    return promotedSession.id;
  })();

  sessionSyncPromisesRef.current.set(localSessionId, syncPromise);
  const resolvedSessionId = await syncPromise;
  sessionSyncPromisesRef.current.delete(localSessionId);
  return resolvedSessionId;
}
