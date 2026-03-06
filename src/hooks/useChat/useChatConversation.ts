import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useState,
} from "react";
import type {
  ConversationDetails,
  Message,
  MessagePageResponse,
  User,
} from "@/types/inbox";
import { useChatConversationData } from "./useChatConversationData";
import {
  useChatConversationLoaderEffect,
  useChatConversationRefreshEffects,
  useChatUserLoaderEffect,
} from "./useChatConversationEffects";
import { useChatConversationMutations } from "./useChatConversationMutations";

interface UseChatConversationParams {
  selectedUserId: string;
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  fetchGenRef: MutableRefObject<number>;
  pendingTempIdsRef: MutableRefObject<string[]>;
  nextCursorRef: MutableRefObject<string | null>;
  reconcileTimersRef: MutableRefObject<number[]>;
  detailsRefreshTimerRef: MutableRefObject<number | null>;
  revalidateInFlightRef: MutableRefObject<boolean>;
}

interface UseChatConversationResult {
  chatHistory: Message[];
  setChatHistory: Dispatch<SetStateAction<Message[]>>;
  loading: boolean;
  loadingOlder: boolean;
  hasMoreMessages: boolean;
  conversationDetails: ConversationDetails | null;
  conversationDetailsSyncedAt: number;
  initialLoadSettled: boolean;
  fetchMessagePage: (
    limit: number,
    cursor?: string,
  ) => Promise<MessagePageResponse>;
  markTempMessagesClientAcked: (tempIds: string[]) => void;
  scheduleConversationDetailsRefresh: () => void;
  loadOlderMessages: () => Promise<void>;
  handleAudioDurationResolved: (messageId: string, duration: string) => void;
}

export function useChatConversation(
  params: UseChatConversationParams,
): UseChatConversationResult {
  const {
    selectedUserId,
    user,
    setUser,
    fetchGenRef,
    pendingTempIdsRef,
    nextCursorRef,
    reconcileTimersRef,
    detailsRefreshTimerRef,
    revalidateInFlightRef,
  } = params;

  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [conversationDetails, setConversationDetails] =
    useState<ConversationDetails | null>(null);
  const [conversationDetailsSyncedAt, setConversationDetailsSyncedAt] =
    useState(0);
  const [initialLoadSettled, setInitialLoadSettled] = useState(false);

  const data = useChatConversationData({
    selectedUserId,
    user,
    fetchGenRef,
    nextCursorRef,
    detailsRefreshTimerRef,
    revalidateInFlightRef,
    setChatHistory,
    setLoading,
    setLoadingOlder,
    setHasMoreMessages,
    setConversationDetails,
    setConversationDetailsSyncedAt,
  });
  const mutations = useChatConversationMutations({
    selectedUserId,
    loadingOlder,
    hasMoreMessages,
    nextCursorRef,
    reconcileTimersRef,
    setChatHistory,
    setLoadingOlder,
    setHasMoreMessages,
    fetchMessagePage: data.fetchMessagePage,
  });

  useChatUserLoaderEffect({ selectedUserId, setUser });
  useChatConversationLoaderEffect({
    selectedUserId,
    fetchGenRef,
    pendingTempIdsRef,
    clearReconcileTimers: mutations.clearReconcileTimers,
    applyConversationSnapshot: data.applyConversationSnapshot,
    refreshConversationDetails: data.refreshConversationDetails,
    refreshLatestMessages: data.refreshLatestMessages,
    setLoading,
    setInitialLoadSettled,
  });
  useChatConversationRefreshEffects({
    selectedUserId,
    revalidateConversationSnapshot: data.revalidateConversationSnapshot,
    revalidateInFlightRef,
    clearReconcileTimers: mutations.clearReconcileTimers,
    detailsRefreshTimerRef,
  });

  return {
    chatHistory,
    setChatHistory,
    loading,
    loadingOlder,
    hasMoreMessages,
    conversationDetails,
    conversationDetailsSyncedAt,
    initialLoadSettled,
    fetchMessagePage: data.fetchMessagePage,
    markTempMessagesClientAcked: mutations.markTempMessagesClientAcked,
    scheduleConversationDetailsRefresh: data.scheduleConversationDetailsRefresh,
    loadOlderMessages: mutations.loadOlderMessages,
    handleAudioDurationResolved: mutations.handleAudioDurationResolved,
  };
}
