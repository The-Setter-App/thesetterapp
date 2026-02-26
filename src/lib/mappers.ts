import type { RawGraphConversation, RawGraphMessage, User, Message, StatusType } from '@/types/inbox';

/**
 * Data Mappers
 * Responsibility: Pure functions to transform Graph API data to application UI models
 */

/**
 * Get relative time string from a date
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 120) return '1 min';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 7200) return '1 hour';
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours`;
  if (diffInSeconds < 172800) return 'Yesterday';
  
  return `${Math.floor(diffInSeconds / 86400)} days`;
}

/**
 * Map a raw Graph API conversation to a User object for the inbox UI
 */
export function mapConversationToUser(
  raw: RawGraphConversation,
  userId: string,
  context?: { accountId?: string; ownerPageId?: string; accountLabel?: string }
): User {
  // Find the participant who is NOT your Instagram user (i.e., the other person)
  const recipient = raw.participants.data.find((p) => p.id !== userId);
  
  // Get the last message from the conversation
  const lastMessage = raw.messages?.data?.[0];
  const lastMessageText = lastMessage?.message || 'No messages yet';
  const needsReply = Boolean(lastMessage && lastMessage.from?.id !== userId);
  
  // Extract username (handle format: @username or username)
  const username = recipient?.username || recipient?.email || `user_${recipient?.id.slice(-6)}`;
  const displayName = username.startsWith('@') ? username : `@${username}`;

  // Default status - in a real app, this would come from your CRM/database
  const status: StatusType = 'New Lead';
  
  return {
    id: raw.id,
    updatedAt: raw.updated_time,
    accountId: context?.accountId,
    ownerInstagramUserId: userId,
    ownerPageId: context?.ownerPageId,
    accountLabel: context?.accountLabel,
    name: displayName,
    time: getRelativeTime(raw.updated_time),
    lastMessage: lastMessageText.length > 35 ? `${lastMessageText.slice(0, 35)}...` : lastMessageText,
    status,
    statusColor: getStatusColor(status),
    icon: 'user',
    avatar: null, // Graph API doesn't provide profile pictures in this endpoint
    verified: false,
    unread: needsReply ? 1 : 0,
    needsReply,
    isActive: false,
    conversationId: raw.id,
    recipientId: recipient?.id || '',
  };
}

/**
 * Get status color classes based on status type
 */
function getStatusColor(status: StatusType): string {
  const colorMap: Record<StatusType, string> = {
    'Won': 'text-green-600 border-green-200 bg-white',
    'Unqualified': 'text-red-500 border-red-200 bg-white',
    'Booked': 'text-purple-600 border-purple-200 bg-white',
    'New Lead': 'text-pink-500 border-pink-200 bg-white',
    'Qualified': 'text-yellow-500 border-yellow-200 bg-white',
    'No-Show': 'text-orange-500 border-orange-200 bg-white',
    'In-Contact': 'text-green-500 border-green-200 bg-white',
    'Retarget': 'text-blue-500 border-blue-200 bg-white',
  };
  
  return colorMap[status] || 'text-gray-500 border-gray-200 bg-white';
}

/**
 * Map a raw Graph API message to an application Message object
 */
export function mapGraphMessageToAppMessage(
  raw: RawGraphMessage,
  userId: string
): Message {
  // Determine if message is from "me" (your Instagram account) or the other user
  const fromMe = raw.from.id === userId;
  
  // Determine message type
  let type: Message['type'] = 'text';
  let attachmentUrl: string | undefined;
  
  if (raw.attachments?.data?.[0]) {
    const attachment = raw.attachments.data[0];
    
    // Check for image_data first (Instagram images don't have mime_type)
    if (attachment.image_data?.url) {
      type = 'image';
      attachmentUrl = attachment.image_data.url;
    } else if (attachment.video_data?.url) {
      type = 'video';
      attachmentUrl = attachment.video_data.url;
    } else if (attachment.file_url) {
      // Check mime_type for other file types
      if (attachment.mime_type?.startsWith('audio/')) {
        type = 'audio';
        attachmentUrl = attachment.file_url;
      } else {
        type = 'file';
        attachmentUrl = attachment.file_url;
      }
    } else if (attachment.mime_type?.startsWith('image/')) {
      type = 'image';
      attachmentUrl = attachment.file_url;
    } else if (attachment.mime_type?.startsWith('video/')) {
      type = 'video';
      attachmentUrl = attachment.file_url;
    } else if (attachment.mime_type?.startsWith('audio/')) {
      type = 'audio';
    } else {
      type = 'file';
    }
  } else if (raw.sticker) {
    type = 'image'; // Treat stickers as images
    attachmentUrl = raw.sticker;
  }

  // Graph may omit attachment URLs for some media payloads (notably audio),
  // but the attachment itself still means this is a real message.
  const hasAttachment = Boolean(raw.attachments?.data?.length);
  const hasContent = raw.message?.trim() || attachmentUrl || raw.sticker || hasAttachment;
  
  return {
    id: raw.id,
    fromMe,
    type,
    text: raw.message,
    timestamp: raw.created_time,
    attachmentUrl,
    isEmpty: !hasContent,
  };
}
