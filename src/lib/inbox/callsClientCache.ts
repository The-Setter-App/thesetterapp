"use client";

import {
  getCachedConversationCalls,
  mergeCachedCalendarCallsFromConversation,
  setCachedConversationCalls,
} from "@/lib/cache";
import type { ConversationCallEvent } from "@/types/calendly";

export const CONVERSATION_CALLS_CACHE_TTL_MS = 2 * 60 * 1000;

export interface ConversationCallsCacheSnapshot {
  calls: ConversationCallEvent[];
  exists: boolean;
  fresh: boolean;
  fetchedAt: number | null;
}

function normalizeConversationId(conversationId: string): string {
  return conversationId.trim();
}

export async function getConversationCallsCacheSnapshot(
  conversationId: string,
): Promise<ConversationCallsCacheSnapshot> {
  const normalizedConversationId = normalizeConversationId(conversationId);
  if (!normalizedConversationId) {
    return { calls: [], exists: false, fresh: false, fetchedAt: null };
  }

  const cached = await getCachedConversationCalls(normalizedConversationId);
  if (!cached) {
    return { calls: [], exists: false, fresh: false, fetchedAt: null };
  }

  const nextCalls = Array.isArray(cached.calls) ? cached.calls : [];
  const fetchedAt =
    typeof cached.fetchedAt === "number" ? cached.fetchedAt : null;
  const fresh =
    fetchedAt !== null &&
    Date.now() - fetchedAt <= CONVERSATION_CALLS_CACHE_TTL_MS;

  return {
    calls: nextCalls,
    exists: true,
    fresh,
    fetchedAt,
  };
}

export async function refreshConversationCallsCache(
  conversationId: string,
  signal?: AbortSignal,
): Promise<ConversationCallEvent[]> {
  const normalizedConversationId = normalizeConversationId(conversationId);
  if (!normalizedConversationId) return [];

  const response = await fetch(
    `/api/inbox/conversations/${encodeURIComponent(normalizedConversationId)}/calls`,
    {
      cache: "no-store",
      signal,
    },
  );

  const data = (await response.json()) as {
    calls?: ConversationCallEvent[];
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || "Failed to load calls.");
  }

  const calls = Array.isArray(data.calls) ? data.calls : [];
  await setCachedConversationCalls(normalizedConversationId, calls);
  await mergeCachedCalendarCallsFromConversation(calls);
  return calls;
}
