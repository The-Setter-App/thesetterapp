"use client";

import { createLayeredCache } from "@/lib/cache/core/layeredCache";
import { APP_CACHE_STORES } from "@/lib/cache/idb/appDb";

export const USERS_CACHE_KEY = "users";
export const MESSAGES_CACHE_PREFIX = "messages_";
export const MESSAGES_META_CACHE_PREFIX = "messages_page_meta_";
export const CONVERSATION_DETAILS_CACHE_PREFIX = "conversation_details_";
export const CONVERSATION_SUMMARY_CACHE_PREFIX = "conversation_summary_";
export const CONVERSATION_CALLS_CACHE_PREFIX = "conversation_calls_";
export const CALENDAR_CALLS_CACHE_KEY = "calendar_calls_workspace";
export const CALENDAR_CALLS_COVERAGE_STALE_MS = 60 * 1000;

export const inboxCache = createLayeredCache({
  storeName: APP_CACHE_STORES.inbox,
  logLabel: "InboxCache",
  writeDebounceMs: 50,
});

export function normalizeConversationId(conversationId: string): string {
  return conversationId.trim();
}

export function messagesKey(conversationId: string): string {
  return `${MESSAGES_CACHE_PREFIX}${conversationId}`;
}

export function messageMetaKey(conversationId: string): string {
  return `${MESSAGES_META_CACHE_PREFIX}${conversationId}`;
}

export function conversationDetailsKey(conversationId: string): string {
  return `${CONVERSATION_DETAILS_CACHE_PREFIX}${conversationId}`;
}

export function conversationSummaryKey(conversationId: string): string {
  return `${CONVERSATION_SUMMARY_CACHE_PREFIX}${conversationId}`;
}

export function conversationCallsKey(conversationId: string): string {
  return `${CONVERSATION_CALLS_CACHE_PREFIX}${conversationId}`;
}

export function calendarEventDetailKey(eventId: string): string {
  return `calendar_event_detail_${eventId.trim()}`;
}

export function normalizeIsoOrEmpty(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) return "";
  return parsed.toISOString();
}

export function mergeCallsById<T extends { id: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const merged = new Map<string, T>();
  for (const item of existing) {
    merged.set(item.id, item);
  }
  for (const item of incoming) {
    const current = merged.get(item.id);
    merged.set(
      item.id,
      current && typeof current === "object" && typeof item === "object"
        ? ({ ...current, ...item } as T)
        : item,
    );
  }
  return Array.from(merged.values());
}
