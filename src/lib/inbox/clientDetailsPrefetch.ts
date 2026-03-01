"use client";

import {
  getCachedConversationDetails,
  setCachedConversationDetailsFromRemote,
} from "@/lib/cache";
import type { ConversationDetails } from "@/types/inbox";

const DEFAULT_MAX_CONVERSATIONS = 30;
const DEFAULT_CONCURRENCY = 4;

const inFlightByConversationId = new Map<string, Promise<void>>();

interface ConversationDetailsResponse {
  details?: ConversationDetails | null;
}

function isClientEnvironment(): boolean {
  return typeof window !== "undefined";
}

function normalizeConversationIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const id of ids) {
    const trimmed = typeof id === "string" ? id.trim() : "";
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

async function fetchConversationDetails(
  conversationId: string,
): Promise<ConversationDetails | null> {
  const response = await fetch(
    `/api/inbox/conversations/${encodeURIComponent(conversationId)}/details`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch conversation details for conversation ${conversationId}`,
    );
  }

  const payload = (await response.json()) as ConversationDetailsResponse;
  return payload.details ?? null;
}

async function shouldPrefetchConversationDetails(params: {
  conversationId: string;
  force: boolean;
}): Promise<boolean> {
  if (params.force) return true;
  const cachedDetails = await getCachedConversationDetails(params.conversationId);
  return !cachedDetails;
}

export async function prefetchConversationDetailsToCache(params: {
  conversationId: string;
  force?: boolean;
}): Promise<void> {
  if (!isClientEnvironment()) return;

  const conversationId = params.conversationId.trim();
  if (!conversationId) return;

  const force = Boolean(params.force);
  const existingRun = inFlightByConversationId.get(conversationId);
  if (existingRun) {
    return existingRun;
  }

  const run = (async () => {
    const shouldPrefetch = await shouldPrefetchConversationDetails({
      conversationId,
      force,
    });
    if (!shouldPrefetch) return;

    const details = await fetchConversationDetails(conversationId);
    if (!details) return;
    await setCachedConversationDetailsFromRemote(conversationId, details);
  })()
    .catch((error) => {
      // Prefetch is best-effort by design.
      throw error;
    })
    .finally(() => {
      inFlightByConversationId.delete(conversationId);
    });

  inFlightByConversationId.set(conversationId, run);
  return run;
}

export async function prefetchConversationDetailsBatchToCache(params: {
  conversationIds: string[];
  maxConversations?: number;
  concurrency?: number;
  force?: boolean;
}): Promise<void> {
  if (!isClientEnvironment()) return;

  const ids = normalizeConversationIds(params.conversationIds);
  if (ids.length === 0) return;

  const maxConversations = Math.max(
    1,
    params.maxConversations ?? DEFAULT_MAX_CONVERSATIONS,
  );
  const concurrency = Math.max(1, params.concurrency ?? DEFAULT_CONCURRENCY);
  const force = Boolean(params.force);
  const targetIds = ids.slice(0, maxConversations);

  let index = 0;
  async function worker(): Promise<void> {
    while (index < targetIds.length) {
      const nextIndex = index;
      index += 1;

      const conversationId = targetIds[nextIndex];
      try {
        await prefetchConversationDetailsToCache({
          conversationId,
          force,
        });
      } catch {
        // Keep batch prefetch resilient to per-conversation failures.
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

