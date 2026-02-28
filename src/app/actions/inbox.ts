'use server';

import { fetchAllConversations, fetchMessages, fetchUserProfile, sendMessage } from '@/lib/graphApi';
import { mapConversationToUser, mapGraphMessageToAppMessage } from '@/lib/mappers';
import { getConnectedInstagramAccounts, getInstagramAccountById } from '@/lib/userRepository';
import { decryptData } from '@/lib/crypto';
import {
  getConversationsFromDb,
  saveConversationsToDb,
  getMessagesFromDb,
  getConversationReplyStateFromDb,
  saveMessagesToDb,
  updateConversationMetadata,
  findConversationById,
  updateUserStatus,
  updateConversationPriority,
  addStatusTimelineEvent,
} from '@/lib/inboxRepository';
import { emitWorkspaceSseEvent } from '@/app/api/sse/route';
import { isStatusType } from '@/lib/status/config';
import type { User, Message } from '@/types/inbox';
import type { SSEAttachment } from '@/types/inbox';
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

async function hydrateConversationReplyState(
  users: User[],
  ownerEmail: string,
): Promise<User[]> {
  if (users.length === 0) return users;

  const enriched = await Promise.all(
    users.map(async (user) => {
      const replyState = await getConversationReplyStateFromDb(user.id, ownerEmail);
      if (!replyState) {
        const fallbackNeedsReply = Boolean(user.needsReply ?? (user.unread ?? 0) > 0);
        return {
          ...user,
          needsReply: fallbackNeedsReply,
          unread: fallbackNeedsReply ? Math.max(1, user.unread ?? 0) : 0,
        };
      }

      return {
        ...user,
        needsReply: replyState.needsReply,
        unread: replyState.pendingIncomingCount,
      };
    }),
  );

  return enriched;
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
  clearUnreadOnReply = false,
  eventTimestampIso?: string,
): Promise<void> {
  try {
    const ownerEmail = await getOwnerEmail();
    const parsedTimestampMs =
      typeof eventTimestampIso === "string" ? Date.parse(eventTimestampIso) : Number.NaN;

    await updateConversationMetadata(
      conversationId,
      ownerEmail,
      lastMessage,
      time,
      incrementUnread,
      clearUnreadOnReply,
      Number.isFinite(parsedTimestampMs) ? eventTimestampIso : undefined,
    );
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
      return await hydrateConversationReplyState(dbUsers, ownerEmail);
    }

    await bootstrapConversationsFromGraph(ownerEmail);
    const syncedUsers = await getConversationsFromDb(ownerEmail);
    return await hydrateConversationReplyState(syncedUsers, ownerEmail);
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
    await sendMessage(account.pageId, conversation.recipientId, text, accessToken, account.graphVersion, {
      tag: 'HUMAN_AGENT',
    });
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

    const retryDelaysMs = [600, 900, 1200, 1500, 2000];
    let matchedOutgoingMessage: Message | undefined;

    for (const delayMs of retryDelaysMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      const freshRawMessages = await fetchMessages(conversationId, accessToken, 10, account.graphVersion);
      const messages = freshRawMessages.map((msg) => mapGraphMessageToAppMessage(msg, account.instagramUserId));
      await saveMessagesToDb(messages, conversationId, ownerEmail);

      const outgoingMessages = messages.filter((message) => message.fromMe);
      if (outgoingMessages.length === 0) {
        continue;
      }

      if (matchCriteria) {
        matchedOutgoingMessage = outgoingMessages.find(
          (message) =>
            (matchCriteria.type ? message.type === matchCriteria.type : true) &&
            (matchCriteria.text !== undefined ? message.text === matchCriteria.text : true)
        );
      } else {
        matchedOutgoingMessage = outgoingMessages[0];
      }

      if (matchedOutgoingMessage) {
        break;
      }
    }

    if (matchedOutgoingMessage) {
      const attachments: SSEAttachment[] = [];
      if (matchedOutgoingMessage.type === 'image' && matchedOutgoingMessage.attachmentUrl) {
        attachments.push({
          type: 'image',
          image_data: { url: matchedOutgoingMessage.attachmentUrl, width: 0, height: 0 },
          payload: { url: matchedOutgoingMessage.attachmentUrl },
        });
      } else if (matchedOutgoingMessage.type === 'video' && matchedOutgoingMessage.attachmentUrl) {
        attachments.push({
          type: 'video',
          video_data: { url: matchedOutgoingMessage.attachmentUrl, width: 0, height: 0 },
          payload: { url: matchedOutgoingMessage.attachmentUrl },
        });
      }

      emitWorkspaceSseEvent(ownerEmail, {
        type: 'message_echo',
        timestamp: new Date().toISOString(),
        data: {
          senderId: account.instagramUserId,
          recipientId: conversation.recipientId,
          conversationId,
          accountId: conversation.accountId,
          messageId: matchedOutgoingMessage.id,
          text: matchedOutgoingMessage.text,
          attachments,
          timestamp: matchedOutgoingMessage.timestamp ? new Date(matchedOutgoingMessage.timestamp).getTime() : Date.now(),
          fromMe: matchedOutgoingMessage.fromMe,
        },
      });
    }

    emitWorkspaceSseEvent(ownerEmail, {
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
    if (!isStatusType(newStatus)) {
      throw new Error('Invalid status type');
    }
    await updateUserStatus(conversationId, ownerEmail, newStatus);
    await addStatusTimelineEvent(conversationId, ownerEmail, newStatus);

    emitWorkspaceSseEvent(ownerEmail, {
      type: 'user_status_updated',
      timestamp: new Date().toISOString(),
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

    emitWorkspaceSseEvent(ownerEmail, {
      type: 'conversation_priority_updated',
      timestamp: new Date().toISOString(),
      data: { conversationId, isPriority },
    });
  } catch (error) {
    console.error('[InboxActions] Error updating conversation priority:', error);
    throw error;
  }
}
