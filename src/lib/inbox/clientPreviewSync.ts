'use client';

import { getCachedUsers, setCachedUsers } from '@/lib/clientCache';

interface ConversationPreviewUpdateParams {
  conversationId: string;
  lastMessage: string;
  time: string;
  updatedAt: string;
}

export async function applyConversationPreviewUpdate(
  params: ConversationPreviewUpdateParams
): Promise<void> {
  const cachedUsers = await getCachedUsers();
  if (cachedUsers?.length) {
    const updatedUsers = cachedUsers.map((user) => {
      if (user.id !== params.conversationId) return user;
      return {
        ...user,
        lastMessage: params.lastMessage,
        time: params.time,
        updatedAt: params.updatedAt,
      };
    });
    await setCachedUsers(updatedUsers);
  }

  window.dispatchEvent(
    new CustomEvent('conversationPreviewHydrated', {
      detail: {
        userId: params.conversationId,
        lastMessage: params.lastMessage,
        time: params.time,
        updatedAt: params.updatedAt,
      },
    })
  );
}
