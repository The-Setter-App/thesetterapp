import type { Message, SSEMessageData, User } from "@/types/inbox";

function getTimestampMs(value?: string): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function isRelativeTimeLabel(value?: string): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized === "just now" ||
    normalized === "yesterday" ||
    normalized.endsWith(" min") ||
    normalized.endsWith(" mins") ||
    normalized.endsWith(" hour") ||
    normalized.endsWith(" hours") ||
    normalized.endsWith(" day") ||
    normalized.endsWith(" days")
  );
}

function getStableDisplayTime(
  updatedAt?: string,
  currentLabel?: string,
): string {
  if (!updatedAt) return currentLabel || "";
  const ms = Date.parse(updatedAt);
  if (!Number.isFinite(ms)) return currentLabel || "";
  if (!isRelativeTimeLabel(currentLabel)) return currentLabel || "";
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizeUsersFromBackend(list: User[]): User[] {
  return list.map((user) => ({
    ...user,
    time: getStableDisplayTime(user.updatedAt, user.time),
  }));
}

export function sortUsersByRecency(list: User[]): User[] {
  return [...list].sort((a, b) => {
    const timeDiff = getTimestampMs(b.updatedAt) - getTimestampMs(a.updatedAt);
    if (timeDiff !== 0) return timeDiff;

    const unreadDiff = (b.unread ?? 0) - (a.unread ?? 0);
    if (unreadDiff !== 0) return unreadDiff;

    return b.id.localeCompare(a.id);
  });
}

export function mergeUsersWithLocalRecency(
  previous: User[],
  incoming: User[],
): User[] {
  const previousById = new Map(previous.map((user) => [user.id, user]));
  const merged = incoming.map((incomingUser) => {
    const previousUser = previousById.get(incomingUser.id);
    if (!previousUser) return incomingUser;
    return getTimestampMs(previousUser.updatedAt) >
      getTimestampMs(incomingUser.updatedAt)
      ? previousUser
      : incomingUser;
  });

  const incomingIds = new Set(incoming.map((user) => user.id));
  for (const previousUser of previous) {
    if (!incomingIds.has(previousUser.id)) {
      merged.push(previousUser);
    }
  }

  return sortUsersByRecency(merged);
}

export function mapRealtimePayloadToMessage(
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

export function buildRealtimePreviewText(
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

  if (isAudio)
    return outgoing ? "You sent a voice message" : "Sent a voice message";
  if (isImage) return outgoing ? "You sent an image" : "Sent an image";
  if (isVideo) return outgoing ? "You sent a video" : "Sent a video";
  if (hasAttachment)
    return outgoing ? "You sent an attachment" : "Sent an attachment";
  return outgoing ? "You sent a message" : "Sent a message";
}

export function mergeMessageCacheSnapshots(
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

export function resolveAudioDurationFromUrl(url: string): Promise<string | null> {
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
