import type { ConversationDetails, MessagePageResponse } from "@/types/inbox";

export async function fetchChatMessagePage(params: {
  selectedUserId: string;
  limit: number;
  cursor?: string;
}): Promise<MessagePageResponse> {
  const searchParams = new URLSearchParams({ limit: String(params.limit) });
  if (params.cursor) searchParams.set("cursor", params.cursor);

  const response = await fetch(
    `/api/inbox/conversations/${encodeURIComponent(params.selectedUserId)}/messages?${searchParams.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Failed to load messages");
  }

  return response.json();
}

export async function fetchChatConversationDetails(
  selectedUserId: string,
): Promise<ConversationDetails | null> {
  const response = await fetch(
    `/api/inbox/conversations/${encodeURIComponent(selectedUserId)}/details`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Failed to load conversation details");
  }
  const data = await response.json();
  return data.details ?? null;
}
