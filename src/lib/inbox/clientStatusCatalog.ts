"use client";

import {
  clearCachedInboxTags,
  getCachedInboxTags,
  setCachedInboxTags,
} from "@/lib/cache";
import type { TagRow } from "@/types/tags";

const INBOX_STATUS_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

interface InboxStatusesResponse {
  statuses?: TagRow[];
}

function isCacheFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < INBOX_STATUS_CATALOG_CACHE_TTL_MS;
}

export function buildStatusLookup(statuses: TagRow[]): Record<string, TagRow> {
  const lookup: Record<string, TagRow> = {};
  for (const status of statuses) {
    lookup[status.name] = status;
  }
  return lookup;
}

async function fetchInboxStatusCatalog(): Promise<TagRow[]> {
  const response = await fetch("/api/inbox/statuses", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load inbox statuses.");
  }

  const payload = (await response.json()) as InboxStatusesResponse;
  const statuses = Array.isArray(payload.statuses) ? payload.statuses : [];
  await setCachedInboxTags(statuses);
  return statuses;
}

export async function loadInboxStatusCatalog(): Promise<TagRow[]> {
  const cached = await getCachedInboxTags();
  if (cached?.tags?.length && isCacheFresh(cached.fetchedAt)) {
    return cached.tags;
  }

  try {
    return await fetchInboxStatusCatalog();
  } catch {
    if (cached?.tags?.length) return cached.tags;
    throw new Error("Failed to load inbox statuses.");
  }
}

export async function refreshInboxStatusCatalog(): Promise<TagRow[]> {
  return fetchInboxStatusCatalog();
}

export async function invalidateInboxStatusCatalogCache(): Promise<void> {
  await clearCachedInboxTags();
}
