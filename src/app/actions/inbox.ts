'use server';

import { fetchAllConversations, fetchMessages, fetchUserProfile, sendMessage } from '@/lib/graphApi';
import { mapConversationToUser, mapGraphMessageToAppMessage } from '@/lib/mappers';
import { getConnectedInstagramAccounts, getInstagramAccountById } from '@/lib/userRepository';
import { decryptData } from '@/lib/crypto';
import {
  getConversationsFromDb,
  saveConversationsToDb,
  getMessagesFromDb,
  saveMessagesToDb,
  updateConversationMetadata,
  findConversationById,
  updateUserStatus,
  updateConversationPriority,
  addStatusTimelineEvent,
} from '@/lib/inboxRepository';
import { sseEmitter } from '@/app/api/sse/route';
import { isStatusType } from '@/lib/status/config';
import type { User, Message, StatusType } from '@/types/inbox';
import { requireInboxWorkspaceContext } from '@/lib/workspace';

async function getOwnerEmail(): Promise<string> {
  const context = await requireInboxWorkspaceContext();
  return context.workspaceOwnerEmail;
}

function excludeSelfConversations(users: User[], instagramUserId: string): User[] {
  return users.filter((u) => u.recipientId && u.recipientId !== instagramUserId);
}

async function bootstrapConversationsFromGraph(ownerEmail: string): Promise<void> {
  const accounts = await getConnectedInstagramAccounts(ownerEmail);
  if (accounts.length === 0) return;

  const syncedUsers: User[] = [];
  for (const account of accounts) {
    try {
      const accessToken = decryptData(account.accessToken);
      const response = await fetchAllConversations(account.pageId, accessToken, {
        pageLimit: 25,
        maxPages: 20,
        graphVersion: account.graphVersion,
      });
      const users = response.data.map((conv) =>
        mapConversationToUser(conv, account.instagramUserId, {
          accountId: account.accountId,
          ownerPageId: account.pageId,
          accountLabel: account.instagramUsername || account.pageName,
        })
      );
      const filtered = excludeSelfConversations(users, account.instagramUserId);

      // One-time enrichment so initial inbox load has avatars before webhook traffic arrives.
      for (const conversation of filtered) {
        if (!conversation.recipientId || conversation.avatar) continue;
        try {
          const profilePic = await fetchUserProfile(
            conversation.recipientId,
            accessToken,
            account.graphVersion
          );
          if (profilePic) {
            conversation.avatar = profilePic;
          }
        } catch {
          // Non-blocking: continue with remaining conversations.
        }
      }
      syncedUsers.push(...filtered);
    } catch (error) {
      console.warn(`[InboxActions] Failed to sync conversations for page ${account.pageId}:`, error);
    }
  }

  if (syncedUsers.length > 0) {
    await saveConversationsToDb(syncedUsers, ownerEmail);
  }
}

export async function getInboxConnectionState(): Promise<{ hasConnectedAccounts: boolean; connectedCount: number }> {
  try {
    const ownerEmail = await getOwnerEmail();
    const accounts = await getConnectedInstagramAccounts(ownerEmail);
    return {
      hasConnectedAccounts: accounts.length > 0,
      connectedCount: accounts.length,
    };
  } catch (error) {
    console.error('[InboxActions] Error in getInboxConnectionState:', error);
    return { hasConnectedAccounts: false, connectedCount: 0 };
  }
}

export async function updateConversationPreview(
  conversationId: string,
  lastMessage: string,
  time: string,
  incrementUnread: boolean,
  clearUnreadOnReply = false
): Promise<void> {
  try {
    const ownerEmail = await getOwnerEmail();
    await updateConversationMetadata(conversationId, ownerEmail, lastMessage, time, incrementUnread, clearUnreadOnReply);
  } catch (error) {
    if ((error as Error).message.includes('Unauthorized')) return;
    console.error('[InboxActions] Error updating conversation preview:', error);
  }
}

export async function getInboxUsers(): Promise<User[]> {
  try {
    const ownerEmail = await getOwnerEmail();
    const dbUsers = await getConversationsFromDb(ownerEmail);
    if (dbUsers.length > 0) {
      return dbUsers;
    }

    await bootstrapConversationsFromGraph(ownerEmail);
    return await getConversationsFromDb(ownerEmail);
  } catch (error) {
    console.error('[InboxActions] Error in getInboxUsers:', error);
    return [];
  }
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  try {
    const ownerEmail = await getOwnerEmail();
    const conversation = await findConversationById(conversationId, ownerEmail);
    if (!conversation?.id || !conversation.accountId) {
      return [];
    }

    const account = await getInstagramAccountById(ownerEmail, conversation.accountId);
    if (!account) return [];

    const dbMessages = await getMessagesFromDb(conversation.id, ownerEmail);

    if (dbMessages.length > 0) {
      return dbMessages.filter((msg) => !msg.isEmpty);
    }

    try {
      const accessToken = decryptData(account.accessToken);
      const rawMessages = await fetchMessages(conversation.id, accessToken, 20, account.graphVersion);
      const apiMessages = rawMessages.map((msg) => mapGraphMessageToAppMessage(msg, account.instagramUserId));
      await saveMessagesToDb(apiMessages, conversation.id, ownerEmail);
    } catch (err) {
      console.error(`[InboxActions] Sync failed for ${conversation.id}:`, err);
    }

    const allMessages = await getMessagesFromDb(conversation.id, ownerEmail);
    return allMessages.filter((msg) => !msg.isEmpty);
  } catch (error) {
    console.error(`[InboxActions] Error fetching messages for conversation ${conversationId}:`, error);
    return [];
  }
}

export async function sendNewMessage(conversationId: string, text: string): Promise<void> {
  try {
    const ownerEmail = await getOwnerEmail();
    const conversation = await findConversationById(conversationId, ownerEmail);
    if (!conversation?.recipientId || !conversation.accountId) {
      throw new Error('No active conversation found');
    }

    const account = await getInstagramAccountById(ownerEmail, conversation.accountId);
    if (!account) {
      throw new Error('No active Instagram connection found');
    }

    const accessToken = decryptData(account.accessToken);
    await sendMessage(account.pageId, conversation.recipientId, text, accessToken, account.graphVersion);
    syncLatestMessages(conversationId, { text }).catch((err) => console.warn('[InboxActions] Background sync failed:', err));
  } catch (error) {
    console.error('[InboxActions] Error sending message:', error);
    throw error;
  }
}

export async function syncLatestMessages(
  conversationId: string,
  matchCriteria?: { text?: string; type?: string }
): Promise<void> {
  try {
    const ownerEmail = await getOwnerEmail();
    const conversation = await findConversationById(conversationId, ownerEmail);
    if (!conversation?.accountId || !conversation.recipientId) return;

    const account = await getInstagramAccountById(ownerEmail, conversation.accountId);
    if (!account) return;

    const accessToken = decryptData(account.accessToken);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const freshRawMessages = await fetchMessages(conversationId, accessToken, 5, account.graphVersion);
    const messages = freshRawMessages.map((msg) => mapGraphMessageToAppMessage(msg, account.instagramUserId));
    await saveMessagesToDb(messages, conversationId, ownerEmail);

    let latestMessage = messages[0];
    if (matchCriteria) {
      latestMessage =
        messages.find(
          (m) =>
            m.fromMe &&
            (matchCriteria.type ? m.type === matchCriteria.type : true) &&
            (matchCriteria.text !== undefined ? m.text === matchCriteria.text : true)
        ) || messages[0];
    }

    if (latestMessage && latestMessage.fromMe) {
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
          senderId: account.instagramUserId,
          recipientId: conversation.recipientId,
          conversationId,
          accountId: conversation.accountId,
          messageId: latestMessage.id,
          text: latestMessage.text,
          attachments,
          timestamp: latestMessage.timestamp ? new Date(latestMessage.timestamp).getTime() : Date.now(),
          fromMe: latestMessage.fromMe,
        },
      });
    }

    sseEmitter.emit('message', {
      type: 'messages_synced',
      timestamp: new Date().toISOString(),
      data: {
        conversationId,
        recipientId: conversation.recipientId,
      },
    });
  } catch (error) {
    console.error('[InboxActions] Error syncing latest messages:', error);
  }
}

export async function updateUserStatusAction(conversationId: string, newStatus: string): Promise<void> {
  try {
    const ownerEmail = await getOwnerEmail();
    await updateUserStatus(conversationId, ownerEmail, newStatus);
    if (isStatusType(newStatus)) {
      await addStatusTimelineEvent(conversationId, ownerEmail, newStatus);
    }

    sseEmitter.emit('message', {
      type: 'user_status_updated',
      data: { conversationId, status: newStatus },
    });
  } catch (error) {
    console.error('[InboxActions] Error updating user status:', error);
    throw error;
  }
}

export async function updateConversationPriorityAction(conversationId: string, isPriority: boolean): Promise<void> {
  try {
    const ownerEmail = await getOwnerEmail();
    await updateConversationPriority(conversationId, ownerEmail, isPriority);

    sseEmitter.emit('message', {
      type: 'conversation_priority_updated',
      data: { conversationId, isPriority },
    });
  } catch (error) {
    console.error('[InboxActions] Error updating conversation priority:', error);
    throw error;
  }
}
