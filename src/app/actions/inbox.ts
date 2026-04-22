"use server";

import { decryptData } from "@/lib/crypto";
import { fetchMessages, sendMessage } from "@/lib/graphApi";
import { ensureWorkspaceInboxData } from "@/lib/inbox/bootstrap";
import { emitWorkspaceSseEvent } from "@/lib/inbox/sseBus";
import {
  addStatusTimelineEvent,
  findConversationById,
  getConversationReplyStateFromDb,
  getConversationsFromDb,
  getMessagesFromDb,
  saveMessagesToDb,
  updateConversationMetadata,
  updateConversationPriority,
  updateUserStatus,
} from "@/lib/inboxRepository";
import { mapGraphMessageToAppMessage } from "@/lib/mappers";
import {
  isStatusType,
  normalizeStatusKey,
  normalizeStatusText,
} from "@/lib/status/config";
import { listWorkspaceStatusNames } from "@/lib/tagsRepository";
import {
  getConnectedInstagramAccounts,
  getInstagramAccountById,
} from "@/lib/userRepository";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";
import type { Message, SSEAttachment, User } from "@/types/inbox";

async function getOwnerEmail(): Promise<string> {
  const context = await requireInboxWorkspaceContext();
  return context.workspaceOwnerEmail;
}

async function hydrateConversationReplyState(
  users: User[],
  ownerEmail: string,
): Promise<User[]> {
  if (users.length === 0) return users;

  const enriched = await Promise.all(
    users.map(async (user) => {
      const replyState = await getConversationReplyStateFromDb(
        user.id,
        ownerEmail,
      );
      if (!replyState) {
        const fallbackNeedsReply = Boolean(
          user.needsReply ?? (user.unread ?? 0) > 0,
        );
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

export async function getInboxConnectionState(): Promise<{
  hasConnectedAccounts: boolean;
  connectedCount: number;
}> {
  try {
    const ownerEmail = await getOwnerEmail();
    const accounts = await getConnectedInstagramAccounts(ownerEmail);
    return {
      hasConnectedAccounts: accounts.length > 0,
      connectedCount: accounts.length,
    };
  } catch (error) {
    console.error("[InboxActions] Error in getInboxConnectionState:", error);
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
      typeof eventTimestampIso === "string"
        ? Date.parse(eventTimestampIso)
        : Number.NaN;

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
    if ((error as Error).message.includes("Unauthorized")) return;
    console.error("[InboxActions] Error updating conversation preview:", error);
  }
}

export async function getInboxUsers(): Promise<User[]> {
  try {
    const ownerEmail = await getOwnerEmail();
    const dbUsers = await getConversationsFromDb(ownerEmail);
    if (dbUsers.length > 0) {
      return await hydrateConversationReplyState(dbUsers, ownerEmail);
    }

    const syncedUsers = await ensureWorkspaceInboxData(ownerEmail, {
      enrichAvatars: true,
    });
    return await hydrateConversationReplyState(syncedUsers, ownerEmail);
  } catch (error) {
    if (error instanceof AccessError) {
      throw error;
    }
    console.error("[InboxActions] Error in getInboxUsers:", error);
    return [];
  }
}

export async function getConversationMessages(
  conversationId: string,
): Promise<Message[]> {
  try {
    const ownerEmail = await getOwnerEmail();
    const conversation = await findConversationById(conversationId, ownerEmail);
    if (!conversation?.id || !conversation.accountId) {
      return [];
    }

    const account = await getInstagramAccountById(
      ownerEmail,
      conversation.accountId,
    );
    if (!account) return [];

    const dbMessages = await getMessagesFromDb(conversation.id, ownerEmail);

    if (dbMessages.length > 0) {
      return dbMessages.filter((msg) => !msg.isEmpty);
    }

    try {
      const accessToken = decryptData(account.accessToken);
      const rawMessages = await fetchMessages(
        conversation.id,
        accessToken,
        20,
        account.graphVersion,
      );
      const apiMessages = rawMessages.map((msg) =>
        mapGraphMessageToAppMessage(msg, account.instagramUserId),
      );
      await saveMessagesToDb(apiMessages, conversation.id, ownerEmail);
    } catch (err) {
      console.error(`[InboxActions] Sync failed for ${conversation.id}:`, err);
    }

    const allMessages = await getMessagesFromDb(conversation.id, ownerEmail);
    return allMessages.filter((msg) => !msg.isEmpty);
  } catch (error) {
    console.error(
      `[InboxActions] Error fetching messages for conversation ${conversationId}:`,
      error,
    );
    return [];
  }
}

export async function sendNewMessage(
  conversationId: string,
  text: string,
): Promise<void> {
  try {
    const ownerEmail = await getOwnerEmail();
    const conversation = await findConversationById(conversationId, ownerEmail);
    if (!conversation?.recipientId || !conversation.accountId) {
      throw new Error("No active conversation found");
    }

    const account = await getInstagramAccountById(
      ownerEmail,
      conversation.accountId,
    );
    if (!account) {
      throw new Error("No active Instagram connection found");
    }

    const accessToken = decryptData(account.accessToken);
    await sendMessage(
      account.pageId,
      conversation.recipientId,
      text,
      accessToken,
      account.graphVersion,
      {
        tag: "HUMAN_AGENT",
      },
    );
  } catch (error) {
    console.error("[InboxActions] Error sending message:", error);
    throw error;
  }
}

export async function syncLatestMessages(
  conversationId: string,
  matchCriteria?: { text?: string; type?: string },
): Promise<void> {
  try {
    const ownerEmail = await getOwnerEmail();
    const conversation = await findConversationById(conversationId, ownerEmail);
    if (!conversation?.accountId || !conversation.recipientId) return;

    const account = await getInstagramAccountById(
      ownerEmail,
      conversation.accountId,
    );
    if (!account) return;

    const accessToken = decryptData(account.accessToken);

    const retryDelaysMs = [600, 900, 1200, 1500, 2000];
    let matchedOutgoingMessage: Message | undefined;

    for (const delayMs of retryDelaysMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      const freshRawMessages = await fetchMessages(
        conversationId,
        accessToken,
        10,
        account.graphVersion,
      );
      const messages = freshRawMessages.map((msg) =>
        mapGraphMessageToAppMessage(msg, account.instagramUserId),
      );
      await saveMessagesToDb(messages, conversationId, ownerEmail);

      const outgoingMessages = messages.filter((message) => message.fromMe);
      if (outgoingMessages.length === 0) {
        continue;
      }

      if (matchCriteria) {
        matchedOutgoingMessage = outgoingMessages.find(
          (message) =>
            (matchCriteria.type ? message.type === matchCriteria.type : true) &&
            (matchCriteria.text !== undefined
              ? message.text === matchCriteria.text
              : true),
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
      if (
        matchedOutgoingMessage.type === "image" &&
        matchedOutgoingMessage.attachmentUrl
      ) {
        attachments.push({
          type: "image",
          image_data: {
            url: matchedOutgoingMessage.attachmentUrl,
            width: 0,
            height: 0,
          },
          payload: { url: matchedOutgoingMessage.attachmentUrl },
        });
      } else if (
        matchedOutgoingMessage.type === "video" &&
        matchedOutgoingMessage.attachmentUrl
      ) {
        attachments.push({
          type: "video",
          video_data: {
            url: matchedOutgoingMessage.attachmentUrl,
            width: 0,
            height: 0,
          },
          payload: { url: matchedOutgoingMessage.attachmentUrl },
        });
      }

      emitWorkspaceSseEvent(ownerEmail, {
        type: "message_echo",
        timestamp: new Date().toISOString(),
        data: {
          senderId: account.instagramUserId,
          recipientId: conversation.recipientId,
          conversationId,
          accountId: conversation.accountId,
          messageId: matchedOutgoingMessage.id,
          text: matchedOutgoingMessage.text,
          attachments,
          timestamp: matchedOutgoingMessage.timestamp
            ? new Date(matchedOutgoingMessage.timestamp).getTime()
            : Date.now(),
          fromMe: matchedOutgoingMessage.fromMe,
        },
      });
    }

    emitWorkspaceSseEvent(ownerEmail, {
      type: "messages_synced",
      timestamp: new Date().toISOString(),
      data: {
        conversationId,
        recipientId: conversation.recipientId,
      },
    });
  } catch (error) {
    console.error("[InboxActions] Error syncing latest messages:", error);
  }
}

export async function updateUserStatusAction(
  conversationId: string,
  newStatus: string,
): Promise<void> {
  try {
    const ownerEmail = await getOwnerEmail();
    if (!isStatusType(newStatus)) {
      throw new Error("Invalid status type");
    }
    const normalizedStatus = normalizeStatusText(newStatus);
    const availableStatusNames = await listWorkspaceStatusNames(ownerEmail);
    const matchedStatus = availableStatusNames.find(
      (statusName) =>
        normalizeStatusKey(statusName) === normalizeStatusKey(normalizedStatus),
    );
    if (!matchedStatus) {
      throw new Error("Status is not allowed for this workspace");
    }

    await updateUserStatus(conversationId, ownerEmail, matchedStatus);
    await addStatusTimelineEvent(conversationId, ownerEmail, matchedStatus);

    emitWorkspaceSseEvent(ownerEmail, {
      type: "user_status_updated",
      timestamp: new Date().toISOString(),
      data: { conversationId, status: matchedStatus },
    });
  } catch (error) {
    console.error("[InboxActions] Error updating user status:", error);
    throw error;
  }
}

export async function updateConversationPriorityAction(
  conversationId: string,
  isPriority: boolean,
): Promise<void> {
  try {
    const ownerEmail = await getOwnerEmail();
    await updateConversationPriority(conversationId, ownerEmail, isPriority);

    emitWorkspaceSseEvent(ownerEmail, {
      type: "conversation_priority_updated",
      timestamp: new Date().toISOString(),
      data: { conversationId, isPriority },
    });
  } catch (error) {
    console.error(
      "[InboxActions] Error updating conversation priority:",
      error,
    );
    throw error;
  }
}
