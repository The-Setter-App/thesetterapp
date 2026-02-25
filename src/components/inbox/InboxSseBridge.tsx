"use client";

import { useEffect, useMemo, useRef } from "react";
import { getInboxUsers } from "@/app/actions/inbox";
import {
  getCachedUsers,
  setCachedUsers,
  updateCachedMessages,
} from "@/lib/clientCache";
import {
  emitInboxRealtimeMessage,
  emitInboxSseEvent,
} from "@/lib/inbox/clientRealtimeEvents";
import { findConversationForRealtimeMessage } from "@/lib/inbox/clientConversationSync";
import {
  buildRealtimePreviewText,
  mapRealtimePayloadToMessage,
  mergeMessageCacheSnapshots,
} from "@/lib/inbox/realtime/messageMapping";
import { reconcilePendingMessages } from "@/lib/inbox/realtime/reconcilePending";
import {
  mergeUsersWithLocalRecency,
  normalizeUsersFromBackend,
  sortUsersByRecency,
} from "./sidebar/utils";
import type { SSEEvent, SSEMessageData, User } from "@/types/inbox";

function isMessageEvent(
  event: SSEEvent,
): event is Extract<SSEEvent, { type: "new_message" | "message_echo" }> {
  return event.type === "new_message" || event.type === "message_echo";
}

function createUpdatedUserSnapshot(params: {
  user: User;
  eventType: "new_message" | "message_echo";
  data: SSEMessageData;
}): User {
  const updatedAt = new Date(params.data.timestamp).toISOString();
  const lastMessage = buildRealtimePreviewText(params.eventType, params.data);
  const outgoing =
    params.eventType === "message_echo" || Boolean(params.data.fromMe);

  return {
    ...params.user,
    lastMessage,
    time: new Date(params.data.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    updatedAt,
    unread: outgoing ? 0 : (params.user.unread ?? 0) + 1,
  };
}

export default function InboxSseBridge() {
  const usersRef = useRef<User[] | null>(null);
  const refreshQueuedRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<void>>(Promise.resolve());

  const scheduleUsersRefresh = useMemo(() => {
    return () => {
      if (refreshQueuedRef.current) return;
      refreshQueuedRef.current = true;

      window.setTimeout(() => {
        refreshPromiseRef.current = refreshPromiseRef.current
          .catch(() => undefined)
          .then(async () => {
            refreshQueuedRef.current = false;
            const freshUsers = await getInboxUsers();
            const normalized = sortUsersByRecency(
              normalizeUsersFromBackend(freshUsers),
            );
            const merged = mergeUsersWithLocalRecency(
              usersRef.current ?? [],
              normalized,
            );
            usersRef.current = merged;
            await setCachedUsers(merged);
          })
          .catch((error) => {
            refreshQueuedRef.current = false;
            console.error("[InboxSseBridge] Failed to refresh users:", error);
          });
      }, 450);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getCachedUsers()
      .then((cached) => {
        if (!isMounted) return;
        if (Array.isArray(cached) && cached.length > 0) {
          usersRef.current = cached;
        }
      })
      .catch((error) =>
        console.error("[InboxSseBridge] Failed to load cached users:", error),
      );

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    eventSource.onmessage = (event) => {
      let message: SSEEvent;
      try {
        message = JSON.parse(event.data) as SSEEvent;
      } catch (error) {
        console.error("[InboxSseBridge] Failed to parse SSE message:", error);
        return;
      }

      emitInboxSseEvent(message);

      if (!isMessageEvent(message)) return;

      const data = message.data;
      const users = usersRef.current ?? [];
      const matchedConversation =
        users.length > 0 ? findConversationForRealtimeMessage(users, data) : null;
      const targetConversationId =
        matchedConversation?.id || data.conversationId || null;
      if (!targetConversationId) {
        scheduleUsersRefresh();
        return;
      }

      const dispatchedData =
        data.conversationId && data.conversationId === targetConversationId
          ? data
          : { ...data, conversationId: targetConversationId };

      emitInboxRealtimeMessage({
        type: message.type,
        data: dispatchedData,
      });

      const canonicalMessage = mapRealtimePayloadToMessage(
        message.type,
        dispatchedData,
      );

      updateCachedMessages(targetConversationId, (existing) => {
        const base = Array.isArray(existing) ? existing : [];
        const reconciled =
          message.type === "message_echo"
            ? reconcilePendingMessages({
                existing: base,
                eventType: message.type,
                data: dispatchedData,
              }).messages
            : base;

        return mergeMessageCacheSnapshots(reconciled, [
          { ...canonicalMessage, pending: false },
        ]);
      }).catch((error) =>
        console.error("[InboxSseBridge] Failed to update message cache:", error),
      );

      if (!matchedConversation) {
        scheduleUsersRefresh();
        return;
      }

      const nextUsers = sortUsersByRecency(
        users.map((user) =>
          user.id === matchedConversation.id
            ? createUpdatedUserSnapshot({
                user,
                eventType: message.type,
                data: dispatchedData,
              })
            : user,
        ),
      );

      usersRef.current = nextUsers;
      setCachedUsers(nextUsers).catch((error) =>
        console.error("[InboxSseBridge] Failed to write users cache:", error),
      );
    };

    eventSource.onerror = () => {
      // EventSource handles reconnects automatically; reconciliation is triggered
      // by the consumers when they observe the next "connected" event.
    };

    return () => {
      eventSource.close();
    };
  }, [scheduleUsersRefresh]);

  return null;
}
