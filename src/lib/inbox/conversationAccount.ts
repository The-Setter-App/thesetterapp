import type { InstagramAccountConnection } from "@/types/auth";
import type { User } from "@/types/inbox";

// Picks the connected Instagram account a conversation belongs to: by account
// id, then by Instagram user id, then the only account when there is just one.
export function resolveConversationAccount(
  conversation: User,
  accounts: InstagramAccountConnection[],
): InstagramAccountConnection | null {
  if (conversation.accountId) {
    const matchedByAccountId =
      accounts.find(
        (account) => account.accountId === conversation.accountId,
      ) || null;
    if (matchedByAccountId) return matchedByAccountId;
  }

  if (conversation.ownerInstagramUserId) {
    const matchedByInstagramUser =
      accounts.find(
        (account) =>
          account.instagramUserId === conversation.ownerInstagramUserId,
      ) || null;
    if (matchedByInstagramUser) return matchedByInstagramUser;
  }

  return accounts.length === 1 ? accounts[0] : null;
}
