import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useCallback,
  useEffect,
} from "react";
import {
  INBOX_MESSAGE_EVENT,
  INBOX_SSE_EVENT,
  type InboxRealtimeMessageDetail,
} from "@/lib/inbox/clientRealtimeEvents";
import { mapRealtimePayloadToMessage } from "@/lib/inbox/realtime/messageMapping";
import { CONVERSATION_STATUS_SYNCED_EVENT } from "@/lib/status/clientSync";
import { isStatusType } from "@/lib/status/config";
import type { Message, SSEEvent, SSEMessageData, User } from "@/types/inbox";
import {
  mergeMessageSnapshot,
  updateChatHistoryWithCache,
} from "./useChatUtils";

interface UseChatRealtimeParams {
  selectedUserId: string;
  user: User | null;
  setChatHistory: Dispatch<SetStateAction<Message[]>>;
  pendingTempIdsRef: MutableRefObject<string[]>;
  setStatusUpdate: Dispatch<
    SetStateAction<{ status: string; timestamp: Date | string } | undefined>
  >;
  scheduleConversationDetailsRefresh: () => void;
  applyUserStatusSnapshot: (status: User["status"], updatedAt?: string) => void;
}

export function useChatRealtime(params: UseChatRealtimeParams): void {
  const {
    selectedUserId,
    user,
    setChatHistory,
    pendingTempIdsRef,
    setStatusUpdate,
    scheduleConversationDetailsRefresh,
    applyUserStatusSnapshot,
  } = params;

  const applyRealtimeMessageToChat = useCallback(
    (eventType: "message_echo" | "new_message", data: SSEMessageData) => {
      const sameConversationId = data.conversationId === selectedUserId;
      const sameParticipant =
        Boolean(user?.recipientId) &&
        (data.senderId === user?.recipientId ||
          data.recipientId === user?.recipientId);
      const sameAccount =
        !user?.accountId ||
        !data.accountId ||
        user.accountId === data.accountId;
      const isForThisConversation =
        sameConversationId || (sameParticipant && sameAccount);

      if (!isForThisConversation) return;

      const newMessage: Message = {
        ...mapRealtimePayloadToMessage(eventType, data),
        pending: false,
        clientAcked: undefined,
      };

      updateChatHistoryWithCache({
        selectedUserId,
        setChatHistory,
        updater: (prev) => {
          const queue = pendingTempIdsRef.current;
          let queueIdx = -1;

          if (newMessage.fromMe && data.clientTempId) {
            queueIdx = queue.indexOf(data.clientTempId);
          }
          if (newMessage.fromMe && queueIdx === -1) {
            queueIdx = queue.findIndex((tempId) => {
              const tempMsg = prev.find((message) => message.id === tempId);
              if (!tempMsg || !tempMsg.pending) return false;
              if (tempMsg.text && newMessage.text) {
                return tempMsg.text === newMessage.text;
              }
              return tempMsg.type === newMessage.type;
            });
          }

          if (queueIdx !== -1) {
            const matchedTempId = queue[queueIdx];
            queue.splice(queueIdx, 1);
            const alreadyExists = prev.some(
              (message) => message.id === newMessage.id,
            );

            return alreadyExists
              ? prev
                  .filter((message) => message.id !== matchedTempId)
                  .map((message) => {
                    if (message.id !== newMessage.id) return message;
                    return {
                      ...message,
                      pending: false,
                      clientAcked: undefined,
                      type:
                        newMessage.type !== "text"
                          ? newMessage.type
                          : message.type,
                      attachmentUrl:
                        newMessage.attachmentUrl || message.attachmentUrl,
                      duration: newMessage.duration || message.duration,
                    };
                  })
              : prev.map((message) => {
                  if (message.id !== matchedTempId) return message;
                  return {
                    ...newMessage,
                    type:
                      newMessage.type !== "text"
                        ? newMessage.type
                        : message.type,
                    attachmentUrl:
                      newMessage.attachmentUrl || message.attachmentUrl,
                    duration: newMessage.duration || message.duration,
                    pending: false,
                    clientAcked: undefined,
                  };
                });
          }

          if (prev.some((message) => message.id === newMessage.id)) {
            return prev.map((message) => {
              if (message.id !== newMessage.id) return message;
              return mergeMessageSnapshot(message, newMessage);
            });
          }

          return [...prev, newMessage];
        },
      });

      scheduleConversationDetailsRefresh();
    },
    [
      pendingTempIdsRef,
      scheduleConversationDetailsRefresh,
      selectedUserId,
      setChatHistory,
      user,
    ],
  );

  useEffect(() => {
    const realtimeMessageHandler = (event: Event) => {
      const customEvent = event as CustomEvent<InboxRealtimeMessageDetail>;
      const detail = customEvent.detail;
      if (!detail?.data || !detail?.type) return;
      applyRealtimeMessageToChat(detail.type, detail.data);
    };

    window.addEventListener(INBOX_MESSAGE_EVENT, realtimeMessageHandler);
    return () => {
      window.removeEventListener(INBOX_MESSAGE_EVENT, realtimeMessageHandler);
    };
  }, [applyRealtimeMessageToChat]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{
        userId?: string;
        status?: User["status"];
        updatedAt?: string;
      }>;
      if (
        customEvent.detail &&
        customEvent.detail.userId === selectedUserId &&
        isStatusType(customEvent.detail.status)
      ) {
        setStatusUpdate({
          status: customEvent.detail.status,
          timestamp: customEvent.detail.updatedAt ?? new Date(),
        });
        applyUserStatusSnapshot(
          customEvent.detail.status,
          customEvent.detail.updatedAt,
        );
      }
    };

    window.addEventListener("userStatusUpdated", handler);
    return () => window.removeEventListener("userStatusUpdated", handler);
  }, [applyUserStatusSnapshot, selectedUserId, setStatusUpdate]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{
        conversationId?: string;
        status?: User["status"];
        updatedAt?: string;
      }>;
      if (
        customEvent.detail?.conversationId !== selectedUserId ||
        !isStatusType(customEvent.detail?.status)
      ) {
        return;
      }
      setStatusUpdate({
        status: customEvent.detail.status,
        timestamp: customEvent.detail.updatedAt ?? new Date(),
      });
      applyUserStatusSnapshot(
        customEvent.detail.status,
        customEvent.detail.updatedAt,
      );
    };

    window.addEventListener(CONVERSATION_STATUS_SYNCED_EVENT, handler);
    return () =>
      window.removeEventListener(CONVERSATION_STATUS_SYNCED_EVENT, handler);
  }, [applyUserStatusSnapshot, selectedUserId, setStatusUpdate]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<SSEEvent>;
      const message = customEvent.detail;
      if (!message || message.type !== "user_status_updated") return;
      if (message.data.conversationId !== selectedUserId) return;
      if (!isStatusType(message.data.status)) return;
      setStatusUpdate({
        status: message.data.status,
        timestamp: message.timestamp ?? new Date(),
      });
      applyUserStatusSnapshot(message.data.status, message.timestamp);
    };

    window.addEventListener(INBOX_SSE_EVENT, handler);
    return () => window.removeEventListener(INBOX_SSE_EVENT, handler);
  }, [applyUserStatusSnapshot, selectedUserId, setStatusUpdate]);
}
