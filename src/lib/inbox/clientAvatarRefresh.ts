// Browser-side half of the profile picture refresh. Several places can show
// the same lead at once (the list row, the chat header, the details panel),
// so they share one request and one answer per conversation.

const refreshByConversationId = new Map<string, Promise<string | null>>();

function readAvatar(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { avatar } = payload as { avatar?: unknown };
  return typeof avatar === "string" && avatar ? avatar : null;
}

async function requestFreshAvatar(
  conversationId: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `/api/inbox/conversations/${encodeURIComponent(conversationId)}/avatar`,
      { method: "POST", cache: "no-store" },
    );
    if (!response.ok) return null;
    return readAvatar(await response.json().catch(() => null));
  } catch {
    return null;
  }
}

// Resolves to a current picture link, or null when there is none. Asked at
// most once per conversation per page load.
export function refreshConversationAvatar(
  conversationId: string,
): Promise<string | null> {
  const existing = refreshByConversationId.get(conversationId);
  if (existing) return existing;

  const request = requestFreshAvatar(conversationId);
  refreshByConversationId.set(conversationId, request);
  return request;
}
