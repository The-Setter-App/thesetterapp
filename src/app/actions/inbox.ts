'use server';

import { fetchConversations, fetchMessages, sendMessage } from '@/lib/graphApi';
import { mapConversationToUser, mapGraphMessageToAppMessage } from '@/lib/mappers';
import { getUserCredentials } from '@/lib/userRepository';
import { decryptData } from '@/lib/crypto';
import { getSession } from '@/lib/auth';
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
 * Helper to get current authenticated user's email
 */
async function getOwnerEmail(): Promise<string> {
  const session = await getSession();
  if (!session?.email) {
    throw new Error('Unauthorized: No active session');
  }
  return session.email;
}

/**
 * Filter out self-conversations (where recipientId is the owner's Instagram ID or empty)
 */
function excludeSelfConversations(users: User[], instagramUserId: string): User[] {
  return users.filter((u) => u.recipientId && u.recipientId !== instagramUserId);
}

/**
 * Resolve a recipientId to the long Graph API conversation ID.
 * Returns undefined if the conversation is not in the DB yet.
 */
async function resolveConversationId(recipientId: string, ownerEmail: string): Promise<string | undefined> {
  const conv = await findConversationByRecipientId(recipientId, ownerEmail);
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
    const ownerEmail = await getOwnerEmail();
    const conversationId = await resolveConversationId(recipientId, ownerEmail);
    if (!conversationId) {
      console.warn(`[InboxActions] Cannot update preview: no conversation found for recipientId ${recipientId}`);
      return;
    }
    await updateConversationMetadata(conversationId, ownerEmail, lastMessage, time, incrementUnread);
  } catch (error) {
    // Suppress error if it's just auth (user might be logging out)
    if ((error as Error).message.includes('Unauthorized')) return;
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
    const ownerEmail = await getOwnerEmail();

    // Fetch credentials early so we can filter self-conversations at every return path
    const creds = await getUserCredentials(ownerEmail);
    const instagramUserId = creds?.instagramUserId || '';

    // 1. Try to get from DB first (Instant Load)
    const dbUsers = await getConversationsFromDb(ownerEmail);

    // 2. Background Sync (Fire & Forget) - Update DB from API without blocking response
    const syncPromise = (async () => {
      try {
        console.log('[InboxActions] Background syncing conversations...');
        
        if (!creds?.instagramUserId) {
          console.warn('[InboxActions] Cannot sync: Missing Instagram credentials');
          return;
        }

        const accessToken = decryptData(creds.accessToken);
        const response = await fetchConversations(creds.pageId, accessToken, 50, creds.graphVersion);
        const users = response.data.map((conv) => mapConversationToUser(conv, creds.instagramUserId));
        // Filter out self-conversations before persisting
        const filtered = excludeSelfConversations(users, creds.instagramUserId);
        await saveConversationsToDb(filtered, ownerEmail);
        console.log('[InboxActions] Background sync complete');
      } catch (err) {
        console.error('[InboxActions] Background sync failed:', err);
      }
    })();

    // If we have data, return immediately. Don't wait for sync.
    if (dbUsers.length > 0) {
      console.log('[InboxActions] Returning cached conversations from DB');
      return excludeSelfConversations(dbUsers, instagramUserId);
    }

    // 3. If DB is empty (first run), we MUST wait for the sync
    console.log('[InboxActions] DB empty, waiting for fresh fetch...');
    await syncPromise;
    const freshUsers = await getConversationsFromDb(ownerEmail);
    return excludeSelfConversations(freshUsers, instagramUserId);
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
    const ownerEmail = await getOwnerEmail();
    const conversationId = await resolveConversationId(recipientId, ownerEmail);
    if (!conversationId) {
      console.warn(`[InboxActions] No conversation found for recipientId ${recipientId}`);
      return [];
    }

    // 1. Try to get from DB first (Instant Load)
    const dbMessages = await getMessagesFromDb(conversationId, ownerEmail);

    // 2. Background Sync (Fire & Forget)
    const syncPromise = (async () => {
      try {
        console.log(`[InboxActions] Background syncing messages for ${conversationId}...`);
        
        const creds = await getUserCredentials(ownerEmail);
        if (!creds?.instagramUserId) {
          console.warn('[InboxActions] Cannot sync messages: Missing Instagram credentials');
          return;
        }

        const accessToken = decryptData(creds.accessToken);
        const rawMessages = await fetchMessages(conversationId, accessToken, creds.graphVersion);
        const apiMessages = rawMessages.map((msg) => mapGraphMessageToAppMessage(msg, creds.instagramUserId));
        await saveMessagesToDb(apiMessages, conversationId, ownerEmail);
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
    
    const allMessages = await getMessagesFromDb(conversationId, ownerEmail);
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
    const ownerEmail = await getOwnerEmail();
    const creds = await getUserCredentials(ownerEmail);
    if (!creds?.instagramUserId) {
      throw new Error('No active Instagram connection found');
    }

    const accessToken = decryptData(creds.accessToken);
    await sendMessage(creds.pageId, recipientId, text, accessToken, creds.graphVersion);
    console.log('[InboxActions] Message sent via API');

    // Pre-warm: fetch fresh messages from API and save to DB
    (async () => {
      try {
        const warmCreds = await getUserCredentials(ownerEmail);
        if (!warmCreds?.instagramUserId) return;

        const warmAccessToken = decryptData(warmCreds.accessToken);
        const conversationId = await resolveConversationId(recipientId, ownerEmail);
        
        if (conversationId) {
          const freshRawMessages = await fetchMessages(conversationId, warmAccessToken, warmCreds.graphVersion);
          const messages = freshRawMessages.map((msg) => mapGraphMessageToAppMessage(msg, warmCreds.instagramUserId));
          await saveMessagesToDb(messages, conversationId, ownerEmail);
          console.log('[InboxActions] Pre-warmed MongoDB message cache after send');

          // Emit SSE event for real-time multi-device sync
          // Graph API usually returns newest messages first. We look for our sent message.
          const latestMessage = messages.find(m => m.fromMe && m.text === text) || messages[0];
          
          if (latestMessage) {
            sseEmitter.emit('message', {
              type: 'message_echo',
              timestamp: new Date().toISOString(),
              data: {
                senderId: warmCreds.instagramUserId,
                recipientId: recipientId,
                messageId: latestMessage.id,
                text: latestMessage.text,
                attachments: [],
                timestamp: latestMessage.timestamp ? new Date(latestMessage.timestamp).getTime() : Date.now(),
                conversationId: conversationId,
                fromMe: true,
              },
            });
            console.log('[InboxActions] Emitted SSE sync event for sent message');
          }
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
    const ownerEmail = await getOwnerEmail();
    await updateUserStatus(recipientId, ownerEmail, newStatus);
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