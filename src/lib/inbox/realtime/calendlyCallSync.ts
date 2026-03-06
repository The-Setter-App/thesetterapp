"use client";

import { refreshConversationCallsCache } from "@/lib/inbox/callsClientCache";

const refreshQueue = new Map<string, Promise<void>>();

function normalizeConversationId(conversationId: string): string {
  return conversationId.trim();
}

export function syncConversationCallsCache(conversationId: string): Promise<void> {
  const normalizedConversationId = normalizeConversationId(conversationId);
  if (!normalizedConversationId) {
    return Promise.resolve();
  }

  const existing = refreshQueue.get(normalizedConversationId);
  if (existing) {
    return existing;
  }

  const refreshTask = refreshConversationCallsCache(normalizedConversationId)
    .then(() => undefined)
    .finally(() => {
      refreshQueue.delete(normalizedConversationId);
    });

  refreshQueue.set(normalizedConversationId, refreshTask);
  return refreshTask;
}
