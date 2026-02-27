"use client";

import { useEffect, useRef } from "react";
import { getInboxUsers } from "@/app/actions/inbox";
import {
  getCachedUsers,
  getCachedMessages,
  setCachedUsers,
  updateCachedMessages,
} from "@/lib/clientCache";
import { findConversationForRealtimeMessage } from "@/lib/inbox/clientConversationSync";
import {
  buildRealtimePreviewText,
  mapRealtimePayloadToMessage,
  mergeMessageCacheSnapshots,
} from "@/lib/inbox/realtime/messageMapping";
import { resolveAudioDurationFromUrl } from "@/lib/inbox/realtime/audioDuration";
import { mergeUsersWithLocalRecency, sortUsersByRecency } from "./sidebar/utils";
import type { SSEEvent, SSEMessageData } from "@/types/inbox";
import { usePathname } from "next/navigation";

interface InboxRealtimeCacheWorkerProps {
  enabled: boolean;
}

export default function InboxRealtimeCacheWorker({
  enabled,
}: InboxRealtimeCacheWorkerProps) {
  const pathname = usePathname();
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const resolvingDurationKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    if (pathname?.startsWith("/inbox")) return;

    const applyRealtimeCacheUpdate = async (
      eventType: "new_message" | "message_echo",
      data: SSEMessageData,
    ) => {
      const cachedUsers = (await getCachedUsers()) ?? [];
      let users = cachedUsers;
      let matchedConversation = findConversationForRealtimeMessage(users, data);

      if (!matchedConversation) {
        try {
          const freshUsers = sortUsersByRecency(await getInboxUsers());
          const mergedUsers = mergeUsersWithLocalRecency(users, freshUsers);
          await setCachedUsers(mergedUsers);
          users = mergedUsers;
          matchedConversation = findConversationForRealtimeMessage(mergedUsers, data);
        } catch (error) {
          console.error("[InboxRealtimeCacheWorker] Failed to fetch fresh users:", error);
        }
      }

      const targetConversationId = matchedConversation?.id || data.conversationId || null;
      if (!targetConversationId) return;

      if (matchedConversation) {
        const updatedAt = new Date(data.timestamp).toISOString();
        const previewText = buildRealtimePreviewText(eventType, data);
        const outgoing = eventType === "message_echo" || Boolean(data.fromMe);
        const nextUsers = users.map((user) => {
          if (user.id !== matchedConversation.id) return user;
          return {
            ...user,
            lastMessage: previewText,
            time: new Date(data.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            updatedAt,
            unread: outgoing ? 0 : (user.unread ?? 0) + 1,
          };
        });
        await setCachedUsers(sortUsersByRecency(nextUsers));
      }

      const optimisticMessage = mapRealtimePayloadToMessage(eventType, data);
      if (
        optimisticMessage.type === "audio" &&
        !optimisticMessage.duration &&
        optimisticMessage.attachmentUrl
      ) {
        const resolvedDuration = await resolveAudioDurationFromUrl(
          optimisticMessage.attachmentUrl,
        );
        if (resolvedDuration) {
          optimisticMessage.duration = resolvedDuration;
        }
      }
      await updateCachedMessages(targetConversationId, (existing) =>
        mergeMessageCacheSnapshots(existing, [optimisticMessage]),
      );

      const hydrateMissingAudioDurations = async () => {
        const cachedMessages = await getCachedMessages(targetConversationId);
        if (!cachedMessages?.length) return;

        const candidates = cachedMessages.filter(
          (message) =>
            message.type === "audio" &&
            !message.duration &&
            Boolean(message.attachmentUrl),
        );
        if (candidates.length === 0) return;

        for (const message of candidates) {
          const key = `${targetConversationId}:${message.id}`;
          if (resolvingDurationKeysRef.current.has(key)) continue;
          resolvingDurationKeysRef.current.add(key);

          try {
            const attachmentUrl = message.attachmentUrl;
            if (!attachmentUrl) continue;

            const resolvedDuration = await resolveAudioDurationFromUrl(attachmentUrl);
            if (!resolvedDuration) continue;

            await updateCachedMessages(targetConversationId, (existing) => {
              if (!existing) return [];
              return existing.map((entry) => {
                if (entry.id !== message.id || entry.type !== "audio") return entry;
                if (entry.duration === resolvedDuration) return entry;
                return { ...entry, duration: resolvedDuration };
              });
            });
          } finally {
            resolvingDurationKeysRef.current.delete(key);
          }
        }
      };

      await hydrateMissingAudioDurations();
    };

    const eventSource = new EventSource("/api/sse");
    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as SSEEvent;
        if (message.type !== "new_message" && message.type !== "message_echo") {
          return;
        }

        syncQueueRef.current = syncQueueRef.current
          .catch(() => undefined)
          .then(() => applyRealtimeCacheUpdate(message.type, message.data))
          .catch((error) => {
            console.error("[InboxRealtimeCacheWorker] Realtime cache update failed:", error);
          });
      } catch (error) {
        console.error("[InboxRealtimeCacheWorker] Failed to parse SSE message:", error);
      }
    };

    eventSource.onerror = () => {
      // EventSource handles retries automatically.
    };

    return () => {
      eventSource.close();
    };
  }, [enabled, pathname]);

  return null;
}
