
'use client';

import type { SSEEvent, SSEMessageData } from '@/types/inbox';

export const INBOX_MESSAGE_EVENT = 'inboxRealtimeMessage';
export const INBOX_SSE_EVENT = 'inboxSseEvent';
export const INBOX_CONVERSATIONS_REFRESHED_EVENT = 'inboxConversationsRefreshed';

export interface InboxRealtimeMessageDetail {
  type: 'new_message' | 'message_echo';
  data: SSEMessageData;
}

export interface InboxConversationsRefreshedDetail {
  conversationIds: string[];
}

export function emitInboxRealtimeMessage(detail: InboxRealtimeMessageDetail): void {
  window.dispatchEvent(new CustomEvent<InboxRealtimeMessageDetail>(INBOX_MESSAGE_EVENT, { detail }));
}

export function emitInboxSseEvent(event: SSEEvent): void {
  window.dispatchEvent(new CustomEvent<SSEEvent>(INBOX_SSE_EVENT, { detail: event }));
}

export function emitInboxConversationsRefreshed(detail: InboxConversationsRefreshedDetail): void {
  window.dispatchEvent(
    new CustomEvent<InboxConversationsRefreshedDetail>(INBOX_CONVERSATIONS_REFRESHED_EVENT, { detail })
  );
}
