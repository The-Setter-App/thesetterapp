'use server';

import { fetchConversations, fetchMessages, sendMessage } from '@/lib/graphApi';
import { mapConversationToUser, mapGraphMessageToAppMessage } from '@/lib/mappers';
import { 
  getConversationsFromDb, 
  saveConversationsToDb, 
  getMessagesFromDb, 
  saveMessagesToDb,
  updateConversationMetadata,
  findConversationByRecipientId,
  updateUserStatus 
} from '@/lib/inboxRepository';
import { sseEmitter } from '@/app/api/sse/route';
import type { User, Message } from '@/types/inbox';

/**
 * Resolve a recipientId to the long Graph API conversation ID.
 * Returns undefined if the conversation is not in the DB yet.
 */
async function resolveConversationId(recipientId: string): Promise<string | undefined> {
  const conv = await findConversationByRecipientId(recipientId);
  return conv?.id;
}

/**
 * Update a conversation's sidebar preview in MongoDB.
 * Called from client components (sidebar SSE handler, chat page on send)
 * to keep the DB in sync with what the user sees.
 *
 * @param recipientId - The participant's Instagram user ID (URL key)
 */
export async function updateConversationPreview(
  recipientId: string,
  lastMessage: string,
  time: string,
  incrementUnread: boolean
): Promise<void> {
  try {
    const conversationId = await resolveConversationId(recipientId);
    if (!conversationId) {
      console.warn(`[InboxActions] Cannot update preview: no conversation found for recipientId ${recipientId}`);
      return;
    }
    await updateConversationMetadata(conversationId, lastMessage, time, incrementUnread);
  } catch (error) {
    console.error('[InboxActions] Error updating conversation preview:', error);
  }
}

/**
 * Server Actions for Inbox Operations
 * Responsibility: Orchestrate data fetching, transformation, and storage
 */

/**
 * Get all inbox users/conversations
 * Fetches fresh data from Graph API to ensure accuracy, then persists to MongoDB.
 * Falls back to MongoDB if API fails.
 * @returns Array of User objects for the inbox list
 */
export async function getInboxUsers(): Promise<User[]> {
  try {
    // 1. Try to get from DB first (Instant Load)
    const dbUsers = await getConversationsFromDb();

    // 2. Background Sync (Fire & Forget) - Update DB from API without blocking response
    const syncPromise = (async () => {
      try {
        console.log('[InboxActions] Background syncing conversations...');
        const response = await fetchConversations();
        const users = response.data.map((conv) => mapConversationToUser(conv));
        await saveConversationsToDb(users);
        console.log('[InboxActions] Background sync complete');
      } catch (err) {
        console.error('[InboxActions] Background sync failed:', err);
      }
    })();

    // If we have data, return immediately. Don't wait for sync.
    if (dbUsers.length > 0) {
      console.log('[InboxActions] Returning cached conversations from DB');
      // In a serverless env, we might need to await to ensure execution, 
      // but for localhost/VPS, this detached promise works to unblock the UI.
      // To be safe in Next.js, we don't await syncPromise here.
      return dbUsers;
    }

    // 3. If DB is empty (first run), we MUST wait for the sync
    console.log('[InboxActions] DB empty, waiting for fresh fetch...');
    await syncPromise;
    return getConversationsFromDb(); // Return the newly saved data
  } catch (error) {
    console.error('[InboxActions] Error in getInboxUsers:', error);
    return [];
  }
}

/**
 * Get messages for a specific conversation.
 * Accepts the participant's recipientId (URL key) and resolves the
 * long Graph API conversationId internally.
 *
 * @param recipientId - The participant's Instagram user ID (URL key)
 * @returns Array of Message objects (empty messages filtered out)
 */
export async function getConversationMessages(recipientId: string): Promise<Message[]> {
  try {
    const conversationId = await resolveConversationId(recipientId);
    if (!conversationId) {
      console.warn(`[InboxActions] No conversation found for recipientId ${recipientId}`);
      return [];
    }

    // 1. Try to get from DB first (Instant Load)
    const dbMessages = await getMessagesFromDb(conversationId);

    // 2. Background Sync (Fire & Forget)
    const syncPromise = (async () => {
      try {
        console.log(`[InboxActions] Background syncing messages for ${conversationId}...`);
        const rawMessages = await fetchMessages(conversationId);
        const apiMessages = rawMessages.map((msg) => mapGraphMessageToAppMessage(msg));
        await saveMessagesToDb(apiMessages, conversationId);
        console.log(`[InboxActions] Background sync complete for ${conversationId}`);
      } catch (err) {
        console.error(`[InboxActions] Background sync failed for ${conversationId}:`, err);
      }
    })();

    // If we have data, return immediately
    if (dbMessages.length > 0) {
      console.log(`[InboxActions] Returning cached messages for ${conversationId} from DB`);
      return dbMessages.filter((msg) => !msg.isEmpty);
    }

    // 3. If DB is empty, wait for sync
    console.log(`[InboxActions] No messages in DB for ${conversationId}, waiting for fresh fetch...`);
    await syncPromise;
    
    const allMessages = await getMessagesFromDb(conversationId);
    return allMessages.filter((msg) => !msg.isEmpty);
  } catch (error) {
    console.error(`[InboxActions] Error fetching messages for recipientId ${recipientId}:`, error);
    return [];
  }
}

/**
 * Send a new message to a recipient.
 * Accepts the participant's recipientId (URL key) and resolves the
 * long Graph API conversationId internally for pre-warming.
 *
 * @param recipientId - Instagram user ID (IGSID) — also the URL key
 * @param text - Message text content
 */
export async function sendNewMessage(
  recipientId: string,
  text: string
): Promise<void> {
  try {
    await sendMessage(recipientId, text);
    console.log('[InboxActions] Message sent via API');

    // Pre-warm: fetch fresh messages from API and save to DB
    // This ensures we capture the "message echo" or any immediate updates
    // if the webhook hasn't processed them yet.
    // Executed in background (Fire & Forget) to avoid blocking the UI spinner.
    (async () => {
      try {
        const conversationId = await resolveConversationId(recipientId);
        if (conversationId) {
          const freshRawMessages = await fetchMessages(conversationId);
          const messages = freshRawMessages.map((msg) => mapGraphMessageToAppMessage(msg));
          await saveMessagesToDb(messages, conversationId);
          console.log('[InboxActions] Pre-warmed MongoDB message cache after send');
        }
      } catch (prewarmError) {
        console.warn('[InboxActions] Pre-warm failed (non-critical):', prewarmError);
      }
    })();
  } catch (error) {
    console.error('[InboxActions] Error sending message:', error);
    throw error;
  }
}

/**
 * Update user status by recipientId
 * 
 * @param recipientId - The participant's Instagram user ID (URL key)
 * @param newStatus - The new status value
 */
export async function updateUserStatusAction(
  recipientId: string,
  newStatus: string
): Promise<void> {
  try {
    await updateUserStatus(recipientId, newStatus);
    // Emit SSE event for real-time update
    sseEmitter.emit('message', {
      type: 'user_status_updated',
      data: { userId: recipientId, status: newStatus }
    });
    console.log(`[InboxActions] Updated status for ${recipientId} to ${newStatus}`);
  } catch (error) {
    console.error('[InboxActions] Error updating user status:', error);
    throw error;
  }
}