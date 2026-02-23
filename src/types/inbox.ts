import type { StatusType } from "@/types/status";

export type { StatusType };

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
  updatedAt?: string;
  accountId?: string;
  ownerInstagramUserId?: string;
  ownerPageId?: string;
  accountLabel?: string;
  name: string;
  time: string;
  lastMessage: string;
  status: StatusType;
  isPriority?: boolean;
  statusColor: string;
  icon: string;
  avatar: string | null;
  verified: boolean;
  unread?: number;
  isActive?: boolean;
  conversationId?: string;
  recipientId?: string;
  tagIds?: string[];
  notes?: string;
  paymentDetails?: PaymentDetails;
}

export interface PaymentDetails {
  amount: string;
  paymentMethod: string;
  payOption: string;
  paymentFrequency: string;
  setterPaid: "Yes" | "No";
  closerPaid: "Yes" | "No";
  paymentNotes: string;
}

export interface ConversationTimelineEvent {
  id: string;
  type: "status_update";
  status: StatusType;
  title: string;
  sub: string;
  timestamp: string;
}

export interface ConversationContactDetails {
  phoneNumber: string;
  email: string;
}

export interface ConversationDetails {
  notes: string;
  paymentDetails: PaymentDetails;
  timelineEvents: ConversationTimelineEvent[];
  contactDetails: ConversationContactDetails;
  tagIds: string[];
}

export interface Message {
  id: string;
  fromMe: boolean;
  type: "text" | "audio" | "image" | "video" | "file";
  text?: string;
  duration?: string;
  status?: string;
  timestamp?: string;
  attachmentUrl?: string;
  isEmpty?: boolean;
  pending?: boolean;
  clientTempId?: string;
  source?: "instagram" | "local_audio_fallback";
  audioStorage?: {
    kind: "gridfs";
    fileId: string;
    mimeType: string;
    size: number;
  };
}

export interface MessagePageResponse {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
  source: "supabase";
}

export interface ConversationSummarySection {
  title: string;
  points: string[];
}

export interface ConversationSummary {
  clientSnapshot: ConversationSummarySection;
  actionPlan: ConversationSummarySection;
  generatedAt?: string;
}

export interface ConversationSummaryResponse {
  summary: ConversationSummary | null;
  source: "cache" | "generated" | "none";
}

// ── SSE Event Types ─────────────────────────────────────────────────────────

/** Attachment shape as sent by the webhook (raw from Facebook). */
export interface SSEAttachment {
  type?: "image" | "video" | "audio" | "file";
  image_data?: { url: string; width: number; height: number };
  video_data?: { url: string; width: number; height: number };
  file_url?: string;
  payload?: { url?: string };
}

/** Payload embedded in every message-related SSE event. */
export interface SSEMessageData {
  senderId: string;
  recipientId: string;
  conversationId: string;
  accountId?: string;
  messageId: string;
  text?: string;
  duration?: string;
  attachments?: SSEAttachment[];
  timestamp: number;
  fromMe?: boolean;
}

/** Payload for read-receipt SSE events. */
export interface SSESeenData {
  senderId: string;
  recipientId: string;
  timestamp: number;
}

/** Payload for messages_synced SSE events. */
export interface SSESyncedData {
  conversationId: string;
  recipientId: string;
}

/** Payload for user_status_updated SSE events. */
export interface SSEUserStatusData {
  conversationId: string;
  status: StatusType;
}

export interface SSEConversationPriorityData {
  conversationId: string;
  isPriority: boolean;
}

/** Union of all SSE events the server can emit. */
export type SSEEvent =
  | { type: "connected"; timestamp: string }
  | { type: "new_message"; timestamp: string; data: SSEMessageData }
  | { type: "message_echo"; timestamp: string; data: SSEMessageData }
  | { type: "message_seen"; timestamp: string; data: SSESeenData }
  | { type: "messages_synced"; timestamp: string; data: SSESyncedData }
  | { type: "user_status_updated"; timestamp?: string; data: SSEUserStatusData }
  | {
      type: "conversation_priority_updated";
      timestamp?: string;
      data: SSEConversationPriorityData;
    };
