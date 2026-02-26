"use client";

import type { MessagePageResponse } from "@/types/inbox";
import {
  getCachedMessagePageMeta,
  getCachedMessages,
  setCachedMessagePageMeta,
  setCachedMessages,
} from "@/lib/clientCache";

const DEFAULT_LIMIT = 20;
const DEFAULT_MAX_CONVERSATIONS = 30;
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_STALE_MS = 2 * 60 * 1000;

const inFlightByConversationId = new Map<string, Promise<void>>();

function isClientEnvironment(): boolean {
  return typeof window !== "undefined";
}

function normalizeConversationIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const id of ids) {
    const trimmed = typeof id === "string" ? id.trim() : "";
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
}

async function fetchMessagePage(params: {
  conversationId: string;
  limit: number;
}): Promise<MessagePageResponse> {
  const search = new URLSearchParams({ limit: String(params.limit) });
  const response = await fetch(
    `/api/inbox/conversations/${encodeURIComponent(params.conversationId)}/messages?${search.toString()}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch messages page for conversation ${params.conversationId}`,
    );
  }

  return response.json() as Promise<MessagePageResponse>;
}

async function shouldPrefetchConversation(params: {
  conversationId: string;
  staleMs: number;
}): Promise<boolean> {
  const [cachedMessages, cachedMeta] = await Promise.all([
    getCachedMessages(params.conversationId),
    getCachedMessagePageMeta(params.conversationId),
  ]);

  if (!cachedMeta) return true;
  if (!cachedMessages || cachedMessages.length === 0) return true;
  if (Date.now() - cachedMeta.fetchedAt > params.staleMs) return true;

  return false;
}

export async function prefetchConversationMessagePageToCache(params: {
  conversationId: string;
  limit?: number;
  staleMs?: number;
  force?: boolean;
}): Promise<void> {
  if (!isClientEnvironment()) return;

  const conversationId = params.conversationId.trim();
  if (!conversationId) return;

  const limit = Math.max(1, params.limit ?? DEFAULT_LIMIT);
  const staleMs = Math.max(0, params.staleMs ?? DEFAULT_STALE_MS);
  const force = Boolean(params.force);

  const existingRun = inFlightByConversationId.get(conversationId);
  if (existingRun) {
    return existingRun;
  }

  const run = (async () => {
    if (!force) {
      const shouldPrefetch = await shouldPrefetchConversation({
        conversationId,
        staleMs,
      });
      if (!shouldPrefetch) return;
    }

    const page = await fetchMessagePage({ conversationId, limit });
    const messages = Array.isArray(page.messages) ? page.messages : [];

    await Promise.all([
      setCachedMessages(conversationId, messages),
      setCachedMessagePageMeta(conversationId, {
        nextCursor: page.nextCursor ?? null,
        hasMore: Boolean(page.hasMore),
        fetchedAt: Date.now(),
      }),
    ]);
  })()
    .catch((error) => {
      // Prefetch should never hard-fail the inbox. Callers can log if they want.
      throw error;
    })
    .finally(() => {
      inFlightByConversationId.delete(conversationId);
    });

  inFlightByConversationId.set(conversationId, run);
  return run;
}

export async function prefetchConversationMessagePagesToCache(params: {
  conversationIds: string[];
  limit?: number;
  maxConversations?: number;
  concurrency?: number;
  staleMs?: number;
  force?: boolean;
}): Promise<void> {
  if (!isClientEnvironment()) return;

  const ids = normalizeConversationIds(params.conversationIds);
  if (ids.length === 0) return;

  const limit = Math.max(1, params.limit ?? DEFAULT_LIMIT);
  const maxConversations = Math.max(
    1,
    params.maxConversations ?? DEFAULT_MAX_CONVERSATIONS,
  );
  const concurrency = Math.max(1, params.concurrency ?? DEFAULT_CONCURRENCY);
  const staleMs = Math.max(0, params.staleMs ?? DEFAULT_STALE_MS);
  const force = Boolean(params.force);

  const targetIds = ids.slice(0, maxConversations);

  let index = 0;
  async function worker(): Promise<void> {
    while (index < targetIds.length) {
      const nextIndex = index;
      index += 1;

      const conversationId = targetIds[nextIndex];
      try {
        await prefetchConversationMessagePageToCache({
          conversationId,
          limit,
          staleMs,
          force,
        });
      } catch {
        // Intentionally ignore per-conversation failures; this is best-effort.
      }
    }
  }

  const workerCount = Math.min(concurrency, targetIds.length);
  const workers: Promise<void>[] = [];
  for (let i = 0; i < workerCount; i += 1) {
    workers.push(worker());
  }
  await Promise.all(workers);
}

