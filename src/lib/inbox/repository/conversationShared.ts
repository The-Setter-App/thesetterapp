import { EMPTY_PREVIEW } from "@/lib/inbox/repository/core";
import type { User } from "@/types/inbox";

export type ConversationDoc = {
  owner_email: string;
  id: string;
  payload: User;
  unread: number;
  status: string | null;
  is_priority: boolean;
  updated_at: string;
};

export function buildConversationSetPayload(
  conversation: User,
  ownerEmail: string,
  existing: Partial<User> | null,
): { payload: User; owner_email: string; id: string } {
  const basePayload: User = {
    ...conversation,
  };

  if (existing?.updatedAt && conversation.updatedAt) {
    const existingMs = Date.parse(existing.updatedAt);
    const incomingMs = Date.parse(conversation.updatedAt);
    if (Number.isFinite(existingMs) && Number.isFinite(incomingMs) && existingMs > incomingMs) {
      basePayload.updatedAt = existing.updatedAt;
    }
  } else if (existing?.updatedAt && !conversation.updatedAt) {
    basePayload.updatedAt = existing.updatedAt;
  }

  const incomingPreview = typeof conversation.lastMessage === "string" ? conversation.lastMessage.trim() : "";
  const existingPreview = typeof existing?.lastMessage === "string" ? existing.lastMessage.trim() : "";
  if ((incomingPreview === "" || incomingPreview === EMPTY_PREVIEW) && existingPreview && existingPreview !== EMPTY_PREVIEW) {
    basePayload.lastMessage = existingPreview;
    if (typeof existing?.time === "string" && existing.time.trim()) {
      basePayload.time = existing.time;
    }
  }

  if (typeof existing?.status === "string") {
    basePayload.status = existing.status as User["status"];
  }
  if (typeof existing?.isPriority === "boolean") {
    basePayload.isPriority = existing.isPriority;
  }
  if (typeof existing?.notes === "string") {
    basePayload.notes = existing.notes;
  }
  if (existing?.paymentDetails) {
    basePayload.paymentDetails = existing.paymentDetails;
  }
  if (Array.isArray(existing?.timelineEvents)) {
    basePayload.timelineEvents = existing.timelineEvents;
  }
  if (existing?.contactDetails) {
    basePayload.contactDetails = existing.contactDetails;
  }

  return {
    payload: basePayload,
    owner_email: ownerEmail,
    id: conversation.id,
  };
}
