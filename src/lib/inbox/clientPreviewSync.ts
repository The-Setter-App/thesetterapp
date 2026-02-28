'use client';

import { getCachedUsers, setCachedUsers } from '@/lib/cache';

interface ConversationPreviewUpdateParams {
  conversationId: string;
  lastMessage: string;
  time: string;
  updatedAt: string;
  clearUnread?: boolean;
}

export interface ConversationPreviewHydrationPayload {
  userId: string;
  lastMessage: string;
  time?: string;
  updatedAt?: string;
  clearUnread?: boolean;
}

const PENDING_PREVIEW_UPDATES_KEY = "inbox_pending_preview_updates";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readPendingPayloads(): ConversationPreviewHydrationPayload[] {
  if (!isBrowser()) return [];
  try {
    const raw = sessionStorage.getItem(PENDING_PREVIEW_UPDATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConversationPreviewHydrationPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingPayloads(payloads: ConversationPreviewHydrationPayload[]): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(PENDING_PREVIEW_UPDATES_KEY, JSON.stringify(payloads));
  } catch {
    // Non-blocking; preview still updates through live event path.
  }
}

export function queueConversationPreviewHydration(
  payload: ConversationPreviewHydrationPayload,
): void {
  const next = readPendingPayloads().filter((item) => item.userId !== payload.userId);
  next.push(payload);
  writePendingPayloads(next);
}

export function getQueuedConversationPreviewHydrations(): ConversationPreviewHydrationPayload[] {
  return readPendingPayloads();
}

export function dequeueConversationPreviewHydrations(userIds: string[]): void {
  if (!userIds.length) return;
  const idSet = new Set(userIds);
  const next = readPendingPayloads().filter((item) => !idSet.has(item.userId));
  writePendingPayloads(next);
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
        unread: params.clearUnread ? 0 : user.unread,
      };
    });
    await setCachedUsers(updatedUsers);
  }

  queueConversationPreviewHydration({
    userId: params.conversationId,
    lastMessage: params.lastMessage,
    time: params.time,
    updatedAt: params.updatedAt,
    clearUnread: params.clearUnread,
  });

  window.dispatchEvent(
    new CustomEvent('conversationPreviewHydrated', {
      detail: {
        userId: params.conversationId,
        lastMessage: params.lastMessage,
        time: params.time,
        updatedAt: params.updatedAt,
        clearUnread: params.clearUnread,
      },
    })
  );
}
