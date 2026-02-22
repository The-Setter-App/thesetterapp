"use client";

import { useEffect, useRef } from "react";
import { getInboxUsers } from "@/app/actions/inbox";
import {
  getCachedUsers,
  getCachedMessages,
  setCachedUsers,
  updateCachedMessages,
} from "@/lib/clientCache";
import {
  fetchLatestConversationMessages,
  findConversationForRealtimeMessage,
} from "@/lib/inbox/clientConversationSync";
import type { Message, SSEEvent, SSEMessageData, User } from "@/types/inbox";
import { usePathname } from "next/navigation";

interface InboxRealtimeCacheWorkerProps {
  enabled: boolean;
}

function getTimestampMs(value?: string): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function sortUsersByRecency(list: User[]): User[] {
  return [...list].sort((a, b) => {
    const timeDiff = getTimestampMs(b.updatedAt) - getTimestampMs(a.updatedAt);
    if (timeDiff !== 0) return timeDiff;

    const unreadDiff = (b.unread ?? 0) - (a.unread ?? 0);
    if (unreadDiff !== 0) return unreadDiff;

    return b.id.localeCompare(a.id);
  });
}

function mapRealtimePayloadToMessage(
  eventType: "new_message" | "message_echo",
  data: SSEMessageData,
): Message {
  const attachment = data.attachments?.[0];
  const payloadUrl = attachment?.payload?.url;
  const fileUrl = attachment?.file_url || payloadUrl;
  const isAudio =
    attachment?.type === "audio" ||
    Boolean(
      fileUrl &&
        (fileUrl.includes("audio") ||
          fileUrl.endsWith(".mp3") ||
          fileUrl.endsWith(".m4a") ||
          fileUrl.endsWith(".ogg") ||
          fileUrl.endsWith(".webm") ||
          fileUrl.endsWith(".mp4")),
    );
  const isImage =
    attachment?.type === "image" || Boolean(attachment?.image_data?.url);
  const isVideo =
    attachment?.type === "video" || Boolean(attachment?.video_data?.url);

  let type: Message["type"] = "text";
  let attachmentUrl: string | undefined;

  if (isImage) {
    type = "image";
    attachmentUrl = attachment?.image_data?.url || fileUrl;
  } else if (isVideo) {
    type = "video";
    attachmentUrl = attachment?.video_data?.url || fileUrl;
  } else if (isAudio) {
    type = "audio";
    attachmentUrl = fileUrl;
  } else if (attachment) {
    type = "file";
    attachmentUrl = fileUrl;
  }

  return {
    id: data.messageId,
    fromMe: eventType === "message_echo" || Boolean(data.fromMe),
    type,
    text: data.text || "",
    duration: data.duration,
    timestamp: new Date(data.timestamp).toISOString(),
    attachmentUrl,
  };
}

function buildRealtimePreviewText(
  eventType: "new_message" | "message_echo",
  data: SSEMessageData,
): string {
  const text = (data.text || "").trim();
  if (text) return text;

  const attachment = data.attachments?.[0];
  const payloadUrl = attachment?.payload?.url;
  const fileUrl = attachment?.file_url || payloadUrl;
  const outgoing = eventType === "message_echo" || Boolean(data.fromMe);
  const isAudio =
    attachment?.type === "audio" ||
    Boolean(
      fileUrl &&
        (fileUrl.includes("audio") ||
          fileUrl.endsWith(".mp3") ||
          fileUrl.endsWith(".m4a") ||
          fileUrl.endsWith(".ogg") ||
          fileUrl.endsWith(".webm") ||
          fileUrl.endsWith(".mp4")),
    );
  const isImage =
    attachment?.type === "image" || Boolean(attachment?.image_data?.url);
  const isVideo =
    attachment?.type === "video" || Boolean(attachment?.video_data?.url);
  const hasAttachment = Boolean(attachment);

  if (isAudio) return outgoing ? "You sent a voice message" : "Sent a voice message";
  if (isImage) return outgoing ? "You sent an image" : "Sent an image";
  if (isVideo) return outgoing ? "You sent a video" : "Sent a video";
  if (hasAttachment) return outgoing ? "You sent an attachment" : "Sent an attachment";
  return outgoing ? "You sent a message" : "Sent a message";
}

function mergeMessageCacheSnapshots(
  existing: Message[] | null,
  incoming: Message[],
): Message[] {
  const byId = new Map<string, Message>();
  for (const message of existing ?? []) {
    byId.set(message.id, message);
  }
  for (const message of incoming) {
    const current = byId.get(message.id);
    byId.set(message.id, current ? { ...current, ...message } : message);
  }

  return Array.from(byId.values()).sort((a, b) => {
    const aTs = Date.parse(a.timestamp || "");
    const bTs = Date.parse(b.timestamp || "");
    if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
      return aTs - bTs;
    }
    return a.id.localeCompare(b.id);
  });
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}

function resolveAudioDurationFromUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const audio = new Audio();

    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("error", onError);
    };

    const onLoadedMetadata = () => {
      const duration = formatDuration(audio.duration);
      cleanup();
      resolve(duration === "0:00" ? null : duration);
    };

    const onError = () => {
      cleanup();
      resolve(null);
    };

    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("error", onError);
    audio.src = url;
    audio.load();
  });
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
          await setCachedUsers(freshUsers);
          users = freshUsers;
          matchedConversation = findConversationForRealtimeMessage(freshUsers, data);
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

      try {
        const latestMessages = await fetchLatestConversationMessages(targetConversationId);
        await updateCachedMessages(targetConversationId, (existing) =>
          mergeMessageCacheSnapshots(existing, latestMessages),
        );
        await hydrateMissingAudioDurations();
      } catch (error) {
        console.error(
          "[InboxRealtimeCacheWorker] Failed to reconcile conversation messages:",
          error,
        );
        await hydrateMissingAudioDurations();
      }
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
