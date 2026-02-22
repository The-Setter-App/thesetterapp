import {
  getCachedConversationDetails,
  getCachedUsers,
  setCachedConversationDetails,
  setCachedUsers,
} from "@/lib/clientCache";

export const CONVERSATION_TAGS_SYNCED_EVENT = "conversationTagsSynced";

export interface ConversationTagsSyncedDetail {
  conversationId: string;
  tagIds: string[];
}

function normalizeTagIds(tagIds: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawTagId of tagIds) {
    const tagId = rawTagId.trim();
    if (!tagId || seen.has(tagId)) continue;
    seen.add(tagId);
    normalized.push(tagId);
  }

  return normalized;
}

export async function syncConversationTagsToClientCache(
  conversationId: string,
  tagIds: string[],
): Promise<void> {
  const normalizedTagIds = normalizeTagIds(tagIds);
  const [cachedUsers, cachedDetails] = await Promise.all([
    getCachedUsers(),
    getCachedConversationDetails(conversationId),
  ]);

  if (cachedUsers?.length) {
    const nextUsers = cachedUsers.map((user) =>
      user.id === conversationId ? { ...user, tagIds: normalizedTagIds } : user,
    );
    await setCachedUsers(nextUsers);
  }

  if (cachedDetails) {
    await setCachedConversationDetails(conversationId, {
      ...cachedDetails,
      tagIds: normalizedTagIds,
    });
  }
}

export function emitConversationTagsSynced(
  detail: ConversationTagsSyncedDetail,
): void {
  window.dispatchEvent(
    new CustomEvent(CONVERSATION_TAGS_SYNCED_EVENT, {
      detail: {
        conversationId: detail.conversationId,
        tagIds: normalizeTagIds(detail.tagIds),
      },
    }),
  );
}
