'use client';

import type { SSEMessageData } from '@/types/inbox';

export const INBOX_MESSAGE_EVENT = 'inboxRealtimeMessage';

export interface InboxRealtimeMessageDetail {
  type: 'new_message' | 'message_echo';
  data: SSEMessageData;
}

export function emitInboxRealtimeMessage(detail: InboxRealtimeMessageDetail): void {
  window.dispatchEvent(new CustomEvent<InboxRealtimeMessageDetail>(INBOX_MESSAGE_EVENT, { detail }));
}
