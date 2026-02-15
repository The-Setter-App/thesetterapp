'use server';

import { fetchConversations, fetchMessages, sendMessage, fetchUserProfile } from '@/lib/graphApi';
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
  updateUserStatus,
  updateUserAvatar
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
  incrementUnread: boolean,
  clearUnreadOnReply = false
): Promise<void> {
  try {
    const ownerEmail = await getOwnerEmail();
    const conversationId = await resolveConversationId(recipientId, ownerEmail);
    if (!conversationId) {
      console.warn(`[InboxActions] Cannot update preview: no conversation found for recipientId ${recipientId}`);
      return;
    }
    await updateConversationMetadata(
      conversationId,
      ownerEmail,
      lastMessage,
      time,
      incrementUnread,
      clearUnreadOnReply
    );
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

        // Fetch profile pics for conversations that don't have one yet
        const savedConversations = await getConversationsFromDb(ownerEmail);
        const withoutAvatar = savedConversations.filter(u => !u.avatar && u.recipientId);

        if (withoutAvatar.length > 0) {
          console.log(`[InboxActions] Fetching profile pics for ${withoutAvatar.length} user(s)...`);
          await Promise.all(
            withoutAvatar.map(async (u) => {
              try {
                const profilePic = await fetchUserProfile(u.recipientId!, accessToken, creds.graphVersion);
                if (profilePic) {
                  await updateUserAvatar(u.recipientId!, ownerEmail, profilePic);
                  console.log(`[InboxActions] Updated avatar for ${u.recipientId}`);
                }
              } catch (err) {
                console.warn(`[InboxActions] Failed to fetch profile pic for ${u.recipientId}:`, err);
              }
            })
          );
        }
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
        const rawMessages = await fetchMessages(conversationId, accessToken, 20, creds.graphVersion);
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
    // Pass matchCriteria to ensure we confirm the specific text message we just sent
    syncLatestMessages(recipientId, { text }).catch(err => 
      console.warn('[InboxActions] Background sync failed:', err)
    );
  } catch (error) {
    console.error('[InboxActions] Error sending message:', error);
    throw error;
  }
}

/**
 * Sync only the latest messages for a conversation and emit SSE updates.
 * Used after sending a message (text or attachment) to get the real message ID and URL.
 * 
 * @param recipientId - The participant's Instagram user ID
 * @param matchCriteria - Optional criteria to find the specific message we just sent (e.g. { type: 'image' })
 */
export async function syncLatestMessages(
  recipientId: string, 
  matchCriteria?: { text?: string; type?: string }
): Promise<void> {
  try {
    const ownerEmail = await getOwnerEmail();
    const creds = await getUserCredentials(ownerEmail);
    if (!creds?.instagramUserId) return;

    const accessToken = decryptData(creds.accessToken);
    const conversationId = await resolveConversationId(recipientId, ownerEmail);
    
    if (conversationId) {
      // Wait a moment for Graph API to propagate the new message/attachment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Optimization: Fetch only latest 5 messages since we likely have the rest
      const freshRawMessages = await fetchMessages(conversationId, accessToken, 5, creds.graphVersion);
      const messages = freshRawMessages.map((msg) => mapGraphMessageToAppMessage(msg, creds.instagramUserId));
      await saveMessagesToDb(messages, conversationId, ownerEmail);
      console.log('[InboxActions] Synced latest messages after send');

      // Emit SSE event for real-time multi-device sync
      // If criteria provided, find the specific message. Otherwise default to the very latest.
      // This handles cases where we send Image + Text quickly; the Image might be the 2nd latest message.
      let latestMessage = messages[0];
      
      if (matchCriteria) {
        latestMessage = messages.find(m => 
          m.fromMe && 
          (matchCriteria.type ? m.type === matchCriteria.type : true) &&
          (matchCriteria.text !== undefined ? m.text === matchCriteria.text : true)
        ) || messages[0];
      }
      
      // Only emit echo if the message is actually from us.
      // If API is lagging and returns the other user's message, we shouldn't confirm our send yet.
      if (latestMessage && latestMessage.fromMe) {
        // Reconstruct attachments for SSE so frontend can replace the optimistic blob URL
        const attachments = [];
        if (latestMessage.type === 'image' && latestMessage.attachmentUrl) {
          attachments.push({ image_data: { url: latestMessage.attachmentUrl } });
        } else if (latestMessage.type === 'video' && latestMessage.attachmentUrl) {
          attachments.push({ video_data: { url: latestMessage.attachmentUrl } });
        }

        sseEmitter.emit('message', {
          type: 'message_echo',
          timestamp: new Date().toISOString(),
          data: {
            senderId: creds.instagramUserId,
            recipientId: recipientId,
            messageId: latestMessage.id,
            text: latestMessage.text,
            attachments: attachments,
            timestamp: latestMessage.timestamp ? new Date(latestMessage.timestamp).getTime() : Date.now(),
            conversationId: conversationId,
            fromMe: latestMessage.fromMe,
          },
        });
        console.log('[InboxActions] Emitted SSE sync event for latest message');
      }

      // Always emit messages_synced so the frontend can re-fetch from DB
      // to pick up real Instagram CDN URLs for attachments
      sseEmitter.emit('message', {
        type: 'messages_synced',
        timestamp: new Date().toISOString(),
        data: {
          conversationId: conversationId,
          recipientId: recipientId,
        },
      });
      console.log('[InboxActions] Emitted messages_synced event');
    }
  } catch (error) {
    console.error('[InboxActions] Error syncing latest messages:', error);
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
