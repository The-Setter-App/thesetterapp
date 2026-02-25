import type { Message, SSEMessageData } from "@/types/inbox";

export type RealtimeMessageEventType = "new_message" | "message_echo";

export function mapRealtimePayloadToMessage(
  eventType: RealtimeMessageEventType,
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
  eventType: RealtimeMessageEventType,
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

