import type { TagRow } from "@/types/tags";

export const MAX_CONVERSATION_TAGS = 12;

function normalizeTagId(tagId: string): string {
  return tagId.trim();
}

export function normalizeConversationTagIds(tagIds: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawTagId of tagIds) {
    const tagId = normalizeTagId(rawTagId);
    if (!tagId || seen.has(tagId)) continue;
    seen.add(tagId);
    normalized.push(tagId);
  }

  return normalized;
}

export function sanitizeConversationTagIds(
  tagIds: string[],
  availableTags: Array<Pick<TagRow, "id">>,
): string[] {
  const normalizedTagIds = normalizeConversationTagIds(tagIds);
  const allowedTagIds = new Set(availableTags.map((tag) => tag.id));

  return normalizedTagIds.filter((tagId) => allowedTagIds.has(tagId));
}
