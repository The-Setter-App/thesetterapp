import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useCallback,
} from "react";
import type { Message, MessagePageResponse } from "@/types/inbox";
import { INITIAL_PAGE_SIZE } from "./useChatConstants";
import {
  cacheChatHistory,
  persistMessagePageMeta,
  updateChatHistoryWithCache,
} from "./useChatUtils";

interface UseChatConversationMutationsParams {
  selectedUserId: string;
  loadingOlder: boolean;
  hasMoreMessages: boolean;
  nextCursorRef: MutableRefObject<string | null>;
  reconcileTimersRef: MutableRefObject<number[]>;
  setChatHistory: Dispatch<SetStateAction<Message[]>>;
  setLoadingOlder: Dispatch<SetStateAction<boolean>>;
  setHasMoreMessages: Dispatch<SetStateAction<boolean>>;
  fetchMessagePage: (
    limit: number,
    cursor?: string,
  ) => Promise<MessagePageResponse>;
}

interface UseChatConversationMutationsResult {
  clearReconcileTimers: () => void;
  markTempMessagesClientAcked: (tempIds: string[]) => void;
  handleAudioDurationResolved: (messageId: string, duration: string) => void;
  loadOlderMessages: () => Promise<void>;
}

export function useChatConversationMutations(
  params: UseChatConversationMutationsParams,
): UseChatConversationMutationsResult {
  const {
    selectedUserId,
    loadingOlder,
    hasMoreMessages,
    nextCursorRef,
    reconcileTimersRef,
    setChatHistory,
    setLoadingOlder,
    setHasMoreMessages,
    fetchMessagePage,
  } = params;

  const clearReconcileTimers = useCallback(() => {
    for (const timer of reconcileTimersRef.current) {
      window.clearTimeout(timer);
    }
    reconcileTimersRef.current = [];
  }, [reconcileTimersRef]);

  const markTempMessagesClientAcked = useCallback(
    (tempIds: string[]) => {
      if (tempIds.length === 0) return;

      updateChatHistoryWithCache({
        selectedUserId,
        setChatHistory,
        updater: (prev) => {
          let changed = false;
          const next = prev.map((message) => {
            if (
              !tempIds.includes(message.id) ||
              !message.pending ||
              message.clientAcked
            ) {
              return message;
            }
            changed = true;
            return { ...message, clientAcked: true };
          });

          return changed ? next : prev;
        },
      });
    },
    [selectedUserId, setChatHistory],
  );

  const handleAudioDurationResolved = useCallback(
    (messageId: string, duration: string) => {
      updateChatHistoryWithCache({
        selectedUserId,
        setChatHistory,
        updater: (prev) => {
          let changed = false;
          const updated = prev.map((message) => {
            if (message.id !== messageId || message.type !== "audio") {
              return message;
            }
            if (message.duration === duration) return message;
            changed = true;
            return { ...message, duration };
          });

          return changed ? updated : prev;
        },
      });
    },
    [selectedUserId, setChatHistory],
  );

  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMoreMessages || !nextCursorRef.current) return;

    try {
      setLoadingOlder(true);
      const page = await fetchMessagePage(
        INITIAL_PAGE_SIZE,
        nextCursorRef.current,
      );

      setChatHistory((prev) => {
        if (page.messages.length === 0) return prev;
        const seen = new Set(prev.map((message) => message.id));
        const older = page.messages.filter((message) => !seen.has(message.id));
        const updated = [...older, ...prev];
        cacheChatHistory(selectedUserId, updated);
        persistMessagePageMeta({
          selectedUserId,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          fetchedAt: Date.now(),
        });
        return updated;
      });

      nextCursorRef.current = page.nextCursor;
      setHasMoreMessages(page.hasMore);
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setLoadingOlder(false);
    }
  }, [
    fetchMessagePage,
    hasMoreMessages,
    loadingOlder,
    nextCursorRef,
    selectedUserId,
    setChatHistory,
    setHasMoreMessages,
    setLoadingOlder,
  ]);

  return {
    clearReconcileTimers,
    markTempMessagesClientAcked,
    handleAudioDurationResolved,
    loadOlderMessages,
  };
}
