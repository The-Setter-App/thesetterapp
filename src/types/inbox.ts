export type StatusType = 'Won' | 'Unqualified' | 'Booked' | 'New Lead' | 'Qualified' | 'No-Show' | 'In-Contact' | 'Retarget';

// Graph API Raw Response Types
export interface RawGraphMessage {
  id: string;
  created_time: string;
  from: {
    id: string;
    username?: string;
    email?: string;
  };
  to: {
    data: Array<{
      id: string;
      username?: string;
      email?: string;
    }>;
  };
  message?: string;
  attachments?: {
    data: Array<{
      id: string;
      mime_type?: string;
      name?: string;
      size?: number;
      image_data?: {
        url: string;
        width: number;
        height: number;
      };
      video_data?: {
        url: string;
        width: number;
        height: number;
      };
      file_url?: string;
    }>;
  };
  sticker?: string;
}

export interface RawGraphConversation {
  id: string;
  updated_time: string;
  participants: {
    data: Array<{
      id: string;
      username?: string;
      email?: string;
    }>;
  };
  messages?: {
    data: RawGraphMessage[];
  };
}

export interface RawGraphConversationsResponse {
  data: RawGraphConversation[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
  };
}

// Application UI Types
export interface User {
  id: string;
  name: string;
  time: string;
  lastMessage: string;
  status: StatusType;
  statusColor: string;
  icon: string;
  avatar: string | null;
  verified: boolean;
  unread?: number;
  isActive?: boolean;
  conversationId?: string;
  recipientId?: string;
}

export interface Message {
  id: string;
  fromMe: boolean;
  type: 'text' | 'audio' | 'image' | 'video' | 'file';
  text?: string;
  duration?: string;
  status?: string;
  timestamp?: string;
  attachmentUrl?: string;
  isEmpty?: boolean;
}

// ── SSE Event Types ─────────────────────────────────────────────────────────

/** Attachment shape as sent by the webhook (raw from Facebook). */
export interface SSEAttachment {
  image_data?: { url: string; width: number; height: number };
  video_data?: { url: string; width: number; height: number };
  file_url?: string;
}

/** Payload embedded in every message-related SSE event. */
export interface SSEMessageData {
  senderId: string;
  recipientId: string;
  messageId: string;
  text?: string;
  attachments?: SSEAttachment[];
  timestamp: number;
  conversationId?: string;
  fromMe?: boolean;
}

/** Payload for read-receipt SSE events. */
export interface SSESeenData {
  senderId: string;
  recipientId: string;
  timestamp: number;
}

/** Union of all SSE events the server can emit. */
export type SSEEvent =
  | { type: 'connected'; timestamp: string }
  | { type: 'new_message'; timestamp: string; data: SSEMessageData }
  | { type: 'message_echo'; timestamp: string; data: SSEMessageData }
  | { type: 'message_seen'; timestamp: string; data: SSESeenData };