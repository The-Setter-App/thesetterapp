import { useCallback, useRef, useState } from "react";
import { useChatComposer } from "@/hooks/useChat/useChatComposer";
import { useChatConversation } from "@/hooks/useChat/useChatConversation";
import { useChatRealtime } from "@/hooks/useChat/useChatRealtime";
import { useChatSend } from "@/hooks/useChat/useChatSend";
import { getInboxStatusColorClass } from "@/lib/status/config";
import type { User } from "@/types/inbox";

export function useChat(selectedUserId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<
    { status: string; timestamp: Date | string } | undefined
  >(undefined);

  const fetchGenRef = useRef(0);
  const pendingTempIdsRef = useRef<string[]>([]);
  const nextCursorRef = useRef<string | null>(null);
  const reconcileTimersRef = useRef<number[]>([]);
  const detailsRefreshTimerRef = useRef<number | null>(null);
  const revalidateInFlightRef = useRef(false);

  const applyUserStatusSnapshot = useCallback(
    (status: User["status"], updatedAt?: string) => {
      setUser((prev) => {
        if (!prev) return prev;
        const nextUpdatedAt = updatedAt ?? new Date().toISOString();
        return {
          ...prev,
          status,
          statusColor: getInboxStatusColorClass(status),
          updatedAt: nextUpdatedAt,
        };
      });
    },
    [],
  );

  const composer = useChatComposer();
  const conversation = useChatConversation({
    selectedUserId,
    user,
    setUser,
    fetchGenRef,
    pendingTempIdsRef,
    nextCursorRef,
    reconcileTimersRef,
    detailsRefreshTimerRef,
    revalidateInFlightRef,
  });
  const send = useChatSend({
    selectedUserId,
    user,
    messageInput: composer.messageInput,
    setMessageInput: composer.setMessageInput,
    attachmentFile: composer.attachmentFile,
    attachmentPreview: composer.attachmentPreview,
    setAttachmentFile: composer.setAttachmentFile,
    setAttachmentPreview: composer.setAttachmentPreview,
    setChatHistory: conversation.setChatHistory,
    pendingTempIdsRef,
    reconcileTimersRef,
    fetchMessagePage: conversation.fetchMessagePage,
    markTempMessagesClientAcked: conversation.markTempMessagesClientAcked,
  });

  useChatRealtime({
    selectedUserId,
    user,
    setChatHistory: conversation.setChatHistory,
    pendingTempIdsRef,
    setStatusUpdate,
    scheduleConversationDetailsRefresh:
      conversation.scheduleConversationDetailsRefresh,
    applyUserStatusSnapshot,
  });

  return {
    user,
    chatHistory: conversation.chatHistory,
    loading: conversation.loading,
    loadingOlder: conversation.loadingOlder,
    hasMoreMessages: conversation.hasMoreMessages,
    messageInput: composer.messageInput,
    setMessageInput: composer.setMessageInput,
    attachmentFile: composer.attachmentFile,
    attachmentPreview: composer.attachmentPreview,
    handleFileSelect: composer.handleFileSelect,
    handleAttachmentPaste: composer.handleAttachmentPaste,
    clearAttachment: composer.clearAttachment,
    handleSendMessage: send.handleSendMessage,
    handleSendAudio: send.handleSendAudio,
    statusUpdate,
    loadOlderMessages: conversation.loadOlderMessages,
    handleAudioDurationResolved: conversation.handleAudioDurationResolved,
    conversationDetails: conversation.conversationDetails,
    conversationDetailsSyncedAt: conversation.conversationDetailsSyncedAt,
    initialLoadSettled: conversation.initialLoadSettled,
  };
}
