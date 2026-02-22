import { EMPTY_PREVIEW } from "@/lib/inbox/repository/core";
import type { User } from "@/types/inbox";

export type ConversationDoc = User & {
  ownerEmail: string;
  unread?: number;
  updatedAt?: string;
  lastMessage?: string;
  time?: string;
  status?: string;
  isPriority?: boolean;
  ownerInstagramUserId?: string;
  recipientId?: string;
};

export function buildConversationSetPayload(
  conversation: User,
  ownerEmail: string,
  existing: Partial<ConversationDoc> | null,
): Record<string, unknown> {
  // Exclude unread from $set so we don't overwrite local unread counts with 0 from API
  // Also exclude avatar if it is null to prevent overwriting existing avatars with null
  const { unread, avatar, ...rest } = conversation;

  const setPayload: Record<string, unknown> = { ...rest, ownerEmail };
  if (avatar) {
    setPayload.avatar = avatar;
  }

  if (existing?.updatedAt && rest.updatedAt) {
    const existingMs = Date.parse(existing.updatedAt);
    const incomingMs = Date.parse(rest.updatedAt);
    if (
      Number.isFinite(existingMs) &&
      Number.isFinite(incomingMs) &&
      existingMs > incomingMs
    ) {
      setPayload.updatedAt = existing.updatedAt;
    }
  } else if (existing?.updatedAt && !rest.updatedAt) {
    setPayload.updatedAt = existing.updatedAt;
  }

  const incomingPreview =
    typeof rest.lastMessage === "string" ? rest.lastMessage.trim() : "";
  const existingPreview =
    typeof existing?.lastMessage === "string"
      ? existing.lastMessage.trim()
      : "";
  if (
    (incomingPreview === "" || incomingPreview === EMPTY_PREVIEW) &&
    existingPreview &&
    existingPreview !== EMPTY_PREVIEW
  ) {
    setPayload.lastMessage = existingPreview;
    if (typeof existing?.time === "string" && existing.time.trim()) {
      setPayload.time = existing.time;
    }
  }

  if (existing && typeof existing.status === "string") {
    setPayload.status = existing.status;
  }
  if (existing && typeof existing.isPriority === "boolean") {
    setPayload.isPriority = existing.isPriority;
  }

  return setPayload;
}
