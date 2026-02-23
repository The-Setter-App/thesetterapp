'use client';

import type { Message, SSEMessageData, User } from '@/types/inbox';

const DEFAULT_MESSAGE_LIMIT = 20;

function matchesParticipant(user: User, data: SSEMessageData): boolean {
  if (!user.recipientId) return false;
  const sameParticipant = user.recipientId === data.senderId || user.recipientId === data.recipientId;
  const sameAccount = !user.accountId || !data.accountId || user.accountId === data.accountId;
  return sameParticipant && sameAccount;
}

export function findConversationForRealtimeMessage(users: User[], data: SSEMessageData): User | null {
  const byConversationId = users.find((user) => user.id === data.conversationId);
  if (byConversationId) return byConversationId;
  return users.find((user) => matchesParticipant(user, data)) ?? null;
}

interface ConversationMessagesResponse {
  messages?: Message[];
}

export async function fetchLatestConversationMessages(
  conversationId: string,
  limit = DEFAULT_MESSAGE_LIMIT
): Promise<Message[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(
    `/api/inbox/conversations/${encodeURIComponent(conversationId)}/messages?${params.toString()}`,
    { cache: 'no-store' }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch latest Supabase messages for conversation ${conversationId}`);
  }
  const payload = (await response.json()) as ConversationMessagesResponse;
  return Array.isArray(payload.messages) ? payload.messages : [];
}
