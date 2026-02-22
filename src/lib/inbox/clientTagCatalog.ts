import { getCachedInboxTags, setCachedInboxTags } from "@/lib/clientCache";
import type { TagRow } from "@/types/tags";

const INBOX_TAGS_CACHE_TTL_MS = 5 * 60 * 1000;

interface InboxTagsResponse {
  tags?: TagRow[];
}

function isCacheFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < INBOX_TAGS_CACHE_TTL_MS;
}

export function buildTagLookup(tags: TagRow[]): Record<string, TagRow> {
  const lookup: Record<string, TagRow> = {};
  for (const tag of tags) {
    lookup[tag.id] = tag;
  }
  return lookup;
}

export async function loadInboxTagCatalog(): Promise<TagRow[]> {
  const cached = await getCachedInboxTags();
  if (cached?.tags?.length && isCacheFresh(cached.fetchedAt)) {
    return cached.tags;
  }

  const response = await fetch("/api/inbox/tags", { cache: "no-store" });
  if (!response.ok) {
    if (cached?.tags?.length) return cached.tags;
    throw new Error("Failed to load inbox tags.");
  }

  const payload = (await response.json()) as InboxTagsResponse;
  const tags = Array.isArray(payload.tags) ? payload.tags : [];
  await setCachedInboxTags(tags);
  return tags;
}
