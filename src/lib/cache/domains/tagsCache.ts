"use client";

import { createLayeredCache } from "@/lib/cache/core/layeredCache";
import { APP_CACHE_STORES } from "@/lib/cache/idb/appDb";
import type { TagRow } from "@/types/tags";

const INBOX_TAGS_CACHE_KEY = "inbox_tags";

export interface InboxTagsCacheRecord {
  tags: TagRow[];
  fetchedAt: number;
}

const tagsCache = createLayeredCache({
  storeName: APP_CACHE_STORES.tags,
  logLabel: "TagsCache",
  writeDebounceMs: 50,
});

export async function getCachedInboxTags(): Promise<InboxTagsCacheRecord | null> {
  return tagsCache.get<InboxTagsCacheRecord>(INBOX_TAGS_CACHE_KEY);
}

export async function setCachedInboxTags(tags: TagRow[]): Promise<void> {
  await tagsCache.set<InboxTagsCacheRecord>(INBOX_TAGS_CACHE_KEY, {
    tags,
    fetchedAt: Date.now(),
  });
}

export async function clearCachedInboxTags(): Promise<void> {
  await tagsCache.delete(INBOX_TAGS_CACHE_KEY);
}
