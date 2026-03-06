import type { Dispatch, SetStateAction } from "react";
import { setCachedMessagePageMeta, setCachedMessages } from "@/lib/cache";
import type { Message } from "@/types/inbox";

export function cacheChatHistory(
  selectedUserId: string,
  messages: Message[],
): void {
  setCachedMessages(selectedUserId, messages).catch((error) =>
    console.error("Cache update failed:", error),
  );
}

export function updateChatHistoryWithCache(params: {
  selectedUserId: string;
  setChatHistory: Dispatch<SetStateAction<Message[]>>;
  updater: (prev: Message[]) => Message[];
}): void {
  const { selectedUserId, setChatHistory, updater } = params;

  setChatHistory((prev) => {
    const next = updater(prev);
    if (next === prev) return prev;
    cacheChatHistory(selectedUserId, next);
    return next;
  });
}

export function persistMessagePageMeta(params: {
  selectedUserId: string;
  nextCursor: string | null;
  hasMore: boolean;
  fetchedAt: number;
}): void {
  setCachedMessagePageMeta(params.selectedUserId, {
    nextCursor: params.nextCursor,
    hasMore: params.hasMore,
    fetchedAt: params.fetchedAt,
  }).catch((error) => console.error("Cache update failed:", error));
}

export function mergeMessageSnapshot(
  existing: Message,
  incoming: Message,
): Message {
  return {
    ...existing,
    ...incoming,
    text: incoming.text || existing.text,
    duration: incoming.duration || existing.duration,
    attachmentUrl: incoming.attachmentUrl || existing.attachmentUrl,
    type: incoming.type !== "text" ? incoming.type : existing.type,
  };
}

export function mergeMessages(base: Message[], incoming: Message[]): Message[] {
  const messageById = new Map<string, Message>();

  for (const message of base) {
    messageById.set(message.id, message);
  }
  for (const message of incoming) {
    const existing = messageById.get(message.id);
    if (!existing) {
      messageById.set(message.id, message);
      continue;
    }

    messageById.set(message.id, mergeMessageSnapshot(existing, message));
  }

  return Array.from(messageById.values()).sort((a, b) => {
    const aTs = Date.parse(a.timestamp || "");
    const bTs = Date.parse(b.timestamp || "");
    if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
      return aTs - bTs;
    }
    return a.id.localeCompare(b.id);
  });
}

export function getMessagePreviewText(message: Message): string {
  const text = typeof message.text === "string" ? message.text.trim() : "";
  if (text) return text;

  if (message.type === "audio") {
    return message.fromMe ? "You sent a voice message" : "Sent a voice message";
  }
  if (message.type === "image") {
    return message.fromMe ? "You sent an image" : "Sent an image";
  }
  if (message.type === "video") {
    return message.fromMe ? "You sent a video" : "Sent a video";
  }
  if (message.type === "file") {
    return message.fromMe ? "You sent an attachment" : "Sent an attachment";
  }

  return message.fromMe ? "You sent a message" : "Sent a message";
}

export function createTempMessageId(kind: "audio" | "img" | "txt"): string {
  return `temp_${Date.now()}_${kind}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatAudioDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
