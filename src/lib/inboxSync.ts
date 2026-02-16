import { fetchAllConversations, fetchMessages, fetchUserProfile } from '@/lib/graphApi';
import { saveConversationsToDb, saveMessagesToDb } from '@/lib/inboxRepository';
import { mapConversationToUser, mapGraphMessageToAppMessage } from '@/lib/mappers';
import { decryptData } from '@/lib/crypto';
import type { InstagramAccountConnection } from '@/types/auth';
import type { User } from '@/types/inbox';

function excludeSelfConversations(users: User[], instagramUserId: string): User[] {
  return users.filter((u) => u.recipientId && u.recipientId !== instagramUserId);
}

export async function syncInboxForAccounts(
  ownerEmail: string,
  accounts: InstagramAccountConnection[]
): Promise<{ syncedConversations: number; syncedMessages: number }> {
  let syncedConversations = 0;
  let syncedMessages = 0;

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
          // Non-blocking avatar enrichment.
        }
      }

      if (filtered.length > 0) {
        await saveConversationsToDb(filtered, ownerEmail);
        syncedConversations += filtered.length;
      }

      for (const conversation of filtered) {
        try {
          const rawMessages = await fetchMessages(
            conversation.id,
            accessToken,
            20,
            account.graphVersion
          );
          const mapped = rawMessages.map((msg) =>
            mapGraphMessageToAppMessage(msg, account.instagramUserId)
          );
          if (mapped.length > 0) {
            await saveMessagesToDb(mapped, conversation.id, ownerEmail);
            syncedMessages += mapped.length;
          }
        } catch (error) {
          console.warn(
            `[InboxSync] Failed to sync messages for conversation ${conversation.id} on account ${account.accountId}:`,
            error
          );
        }
      }
    } catch (error) {
      console.warn(
        `[InboxSync] Failed to sync inbox for connected account ${account.accountId}:`,
        error
      );
    }
  }

  return { syncedConversations, syncedMessages };
}
