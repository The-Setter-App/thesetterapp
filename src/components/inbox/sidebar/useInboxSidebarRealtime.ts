import { useEffect } from "react";
import {
  type ConversationPreviewHydrationPayload,
  dequeueConversationPreviewHydrations,
  getQueuedConversationPreviewHydrations,
} from "@/lib/inbox/clientPreviewSync";
import {
  INBOX_MESSAGE_EVENT,
  INBOX_SSE_EVENT,
  type InboxRealtimeMessageDetail,
} from "@/lib/inbox/clientRealtimeEvents";
import {
  CONVERSATION_STATUS_SYNCED_EVENT,
  emitConversationStatusSynced,
  syncConversationStatusToClientCache,
} from "@/lib/status/clientSync";
import { isStatusType } from "@/lib/status/config";
import type { SSEEvent, SSEMessageData, StatusType } from "@/types/inbox";

interface UseInboxSidebarRealtimeOptions {
  usersLength: number;
  refetchConversations: () => Promise<void>;
  applyHydratedPreview: (
    payload: ConversationPreviewHydrationPayload,
  ) => boolean;
  applyOptimisticRealtimePreview: (
    eventType: "new_message" | "message_echo",
    data: SSEMessageData,
  ) => void;
  applyUserPriorityUpdate: (userId: string, isPriority: boolean) => void;
  applyUserStatusUpdate: (
    userId: string,
    status: StatusType,
    updatedAt?: string,
  ) => void;
}

export default function useInboxSidebarRealtime({
  usersLength,
  refetchConversations,
  applyHydratedPreview,
  applyOptimisticRealtimePreview,
  applyUserPriorityUpdate,
  applyUserStatusUpdate,
}: UseInboxSidebarRealtimeOptions): void {
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetchConversations().catch((error) => {
          console.error("Failed to refresh conversations:", error);
        });
      }
    };

    const onFocus = () => {
      refetchConversations().catch((error) => {
        console.error("Failed to refresh conversations:", error);
      });
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [refetchConversations]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<InboxRealtimeMessageDetail>;
      if (!customEvent.detail?.type || !customEvent.detail?.data) return;
      applyOptimisticRealtimePreview(
        customEvent.detail.type,
        customEvent.detail.data,
      );
    };

    window.addEventListener(INBOX_MESSAGE_EVENT, handler);
    return () => window.removeEventListener(INBOX_MESSAGE_EVENT, handler);
  }, [applyOptimisticRealtimePreview]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<SSEEvent>;
      const message = customEvent.detail;
      if (!message || typeof message !== "object") return;

      if (message.type === "user_status_updated") {
        if (isStatusType(message.data.status)) {
          applyUserStatusUpdate(
            message.data.conversationId,
            message.data.status,
            message.timestamp,
          );
          syncConversationStatusToClientCache(
            message.data.conversationId,
            message.data.status,
          ).catch((error) =>
            console.error("Failed to sync status cache:", error),
          );
          emitConversationStatusSynced({
            conversationId: message.data.conversationId,
            status: message.data.status,
            updatedAt:
              typeof message.timestamp === "string"
                ? message.timestamp
                : undefined,
          });
        }
        return;
      }

      if (message.type === "conversation_priority_updated") {
        applyUserPriorityUpdate(
          message.data.conversationId,
          Boolean(message.data.isPriority),
        );
      }
    };

    window.addEventListener(INBOX_SSE_EVENT, handler);
    return () => window.removeEventListener(INBOX_SSE_EVENT, handler);
  }, [applyUserPriorityUpdate, applyUserStatusUpdate]);

  useEffect(() => {
    const legacyHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{
        userId?: string;
        status?: StatusType;
        updatedAt?: string;
      }>;
      if (
        !customEvent.detail?.userId ||
        !isStatusType(customEvent.detail.status)
      ) {
        return;
      }

      applyUserStatusUpdate(
        customEvent.detail.userId,
        customEvent.detail.status,
        customEvent.detail.updatedAt,
      );
    };

    const statusSyncedHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{
        conversationId?: string;
        status?: StatusType;
        updatedAt?: string;
      }>;
      if (
        !customEvent.detail?.conversationId ||
        !isStatusType(customEvent.detail.status)
      ) {
        return;
      }

      applyUserStatusUpdate(
        customEvent.detail.conversationId,
        customEvent.detail.status,
        customEvent.detail.updatedAt,
      );
    };

    const previewHydratedHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{
        userId?: string;
        lastMessage?: string;
        time?: string;
        updatedAt?: string;
        clearUnread?: boolean;
      }>;
      const payload = customEvent.detail;
      if (!payload?.userId || !payload.lastMessage) return;

      const applied = applyHydratedPreview({
        userId: payload.userId,
        lastMessage: payload.lastMessage,
        time: payload.time,
        updatedAt: payload.updatedAt,
        clearUnread: payload.clearUnread,
      });
      if (applied) {
        dequeueConversationPreviewHydrations([payload.userId]);
      }
    };

    window.addEventListener("userStatusUpdated", legacyHandler);
    window.addEventListener(
      CONVERSATION_STATUS_SYNCED_EVENT,
      statusSyncedHandler,
    );
    window.addEventListener(
      "conversationPreviewHydrated",
      previewHydratedHandler,
    );
    return () => {
      window.removeEventListener("userStatusUpdated", legacyHandler);
      window.removeEventListener(
        CONVERSATION_STATUS_SYNCED_EVENT,
        statusSyncedHandler,
      );
      window.removeEventListener(
        "conversationPreviewHydrated",
        previewHydratedHandler,
      );
    };
  }, [applyHydratedPreview, applyUserStatusUpdate]);

  useEffect(() => {
    if (usersLength === 0) return;

    const queuedHydrations = getQueuedConversationPreviewHydrations();
    if (queuedHydrations.length === 0) return;

    const appliedIds: string[] = [];
    for (const payload of queuedHydrations) {
      if (applyHydratedPreview(payload)) {
        appliedIds.push(payload.userId);
      }
    }

    if (appliedIds.length > 0) {
      dequeueConversationPreviewHydrations(appliedIds);
    }
  }, [usersLength, applyHydratedPreview]);
}
