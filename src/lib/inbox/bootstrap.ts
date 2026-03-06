import { decryptData } from "@/lib/crypto";
import {
  fetchAllConversations,
  fetchMessagesChunk,
  fetchUserProfile,
} from "@/lib/graphApi";
import {
  getConversationSyncState,
  getConversationsFromDb,
  saveConversationsToDb,
  saveMessagesToDb,
  updateConversationSyncState,
} from "@/lib/inboxRepository";
import {
  mapConversationToUser,
  mapGraphMessageToAppMessage,
} from "@/lib/mappers";
import { getConnectedInstagramAccounts } from "@/lib/userRepository";
import type { InstagramAccountConnection } from "@/types/auth";
import type { User } from "@/types/inbox";

const CONVERSATION_PAGE_LIMIT = 25;
const CONVERSATION_MAX_PAGES = 20;
const MESSAGE_CHUNK_LIMIT = 25;
const MESSAGE_MAX_PAGES_PER_CONVERSATION = 2;
const MESSAGE_MAX_CONVERSATIONS_PER_PASS = 20;
const INBOX_BOOTSTRAP_LOCKS_KEY = "__setterapp_inbox_bootstrap_locks__";

type InboxBootstrapOptions = {
  enrichAvatars?: boolean;
};

function getBootstrapLocks(): Map<string, Promise<User[]>> {
  const globalWithLocks = globalThis as typeof globalThis & {
    [INBOX_BOOTSTRAP_LOCKS_KEY]?: Map<string, Promise<User[]>>;
  };

  if (!globalWithLocks[INBOX_BOOTSTRAP_LOCKS_KEY]) {
    globalWithLocks[INBOX_BOOTSTRAP_LOCKS_KEY] = new Map<
      string,
      Promise<User[]>
    >();
  }

  return globalWithLocks[INBOX_BOOTSTRAP_LOCKS_KEY];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function excludeSelfConversations(
  conversations: User[],
  instagramUserId: string,
): User[] {
  return conversations.filter(
    (conversation) =>
      Boolean(conversation.recipientId) &&
      conversation.recipientId !== instagramUserId,
  );
}

function sortConversationsByUpdatedAtDesc(conversations: User[]): User[] {
  return [...conversations].sort((left, right) => {
    const leftMs = Date.parse(left.updatedAt || "");
    const rightMs = Date.parse(right.updatedAt || "");

    if (
      Number.isFinite(leftMs) &&
      Number.isFinite(rightMs) &&
      leftMs !== rightMs
    ) {
      return rightMs - leftMs;
    }

    if (Number.isFinite(leftMs)) return -1;
    if (Number.isFinite(rightMs)) return 1;
    return right.id.localeCompare(left.id);
  });
}

async function enrichConversationAvatars(
  conversations: User[],
  account: InstagramAccountConnection,
  accessToken: string,
): Promise<User[]> {
  const enriched = [...conversations];

  for (const conversation of enriched) {
    if (!conversation.recipientId || conversation.avatar) continue;

    try {
      const profilePic = await fetchUserProfile(
        conversation.recipientId,
        accessToken,
        account.graphVersion,
      );
      if (profilePic) {
        conversation.avatar = profilePic;
      }
    } catch {
      // Non-blocking: leave the avatar empty and continue.
    }
  }

  return enriched;
}

function resolveConversationAccount(
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

async function syncConversationMessages(
  ownerEmail: string,
  conversation: User,
  account: InstagramAccountConnection,
): Promise<void> {
  const syncState = await getConversationSyncState(conversation.id, ownerEmail);
  if (syncState?.syncStatus === "done") {
    return;
  }

  const startedAt = new Date().toISOString();
  let syncBeforeCursor = syncState?.syncBeforeCursor;
  let syncMessageCount = syncState?.syncMessageCount ?? 0;
  let completed = false;

  await updateConversationSyncState(conversation.id, ownerEmail, {
    syncStatus: "running",
    syncStartedAt: startedAt,
    syncError: "",
  });

  try {
    const accessToken = decryptData(account.accessToken);

    for (
      let pageIndex = 0;
      pageIndex < MESSAGE_MAX_PAGES_PER_CONVERSATION;
      pageIndex += 1
    ) {
      const chunk = await fetchMessagesChunk(
        conversation.id,
        accessToken,
        MESSAGE_CHUNK_LIMIT,
        syncBeforeCursor,
        account.graphVersion,
      );

      const mappedMessages = chunk.messages.map((message) =>
        mapGraphMessageToAppMessage(message, account.instagramUserId),
      );

      if (mappedMessages.length > 0) {
        await saveMessagesToDb(mappedMessages, conversation.id, ownerEmail);
        syncMessageCount += mappedMessages.length;
      }

      syncBeforeCursor = chunk.nextBeforeCursor || undefined;
      if (!syncBeforeCursor) {
        completed = true;
        break;
      }
    }

    await updateConversationSyncState(conversation.id, ownerEmail, {
      syncStatus: completed ? "done" : "pending",
      syncBeforeCursor,
      syncCompletedAt: completed ? new Date().toISOString() : undefined,
      syncError: "",
      syncMessageCount,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to sync conversation messages.";

    await updateConversationSyncState(conversation.id, ownerEmail, {
      syncStatus: "error",
      syncBeforeCursor,
      syncError: message,
      syncMessageCount,
    });
  }
}

async function syncMessagesForRecentConversations(
  ownerEmail: string,
  conversations: User[],
  accounts: InstagramAccountConnection[],
): Promise<void> {
  const recentConversations = sortConversationsByUpdatedAtDesc(
    conversations,
  ).slice(0, MESSAGE_MAX_CONVERSATIONS_PER_PASS);

  for (const conversation of recentConversations) {
    const account = resolveConversationAccount(conversation, accounts);
    if (!account) continue;
    await syncConversationMessages(ownerEmail, conversation, account);
  }
}

export async function syncWorkspaceConversationsFromGraph(
  ownerEmail: string,
  options: InboxBootstrapOptions = {},
): Promise<User[]> {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const accounts = await getConnectedInstagramAccounts(normalizedOwnerEmail);
  if (accounts.length === 0) {
    return [];
  }

  const syncedUsers: User[] = [];
  for (const account of accounts) {
    try {
      const accessToken = decryptData(account.accessToken);
      const response = await fetchAllConversations(
        account.pageId,
        accessToken,
        {
          pageLimit: CONVERSATION_PAGE_LIMIT,
          maxPages: CONVERSATION_MAX_PAGES,
          graphVersion: account.graphVersion,
        },
      );

      let users = response.data.map((conversation) =>
        mapConversationToUser(conversation, account.instagramUserId, {
          accountId: account.accountId,
          ownerPageId: account.pageId,
          accountLabel: account.instagramUsername || account.pageName,
        }),
      );

      users = excludeSelfConversations(users, account.instagramUserId);

      if (options.enrichAvatars) {
        users = await enrichConversationAvatars(users, account, accessToken);
      }

      syncedUsers.push(...users);
    } catch (error) {
      console.warn(
        `[InboxBootstrap] Failed to sync conversations for page ${account.pageId}:`,
        error,
      );
    }
  }

  if (syncedUsers.length === 0) {
    return [];
  }

  await saveConversationsToDb(syncedUsers, normalizedOwnerEmail);
  return getConversationsFromDb(normalizedOwnerEmail);
}

export async function ensureWorkspaceInboxData(
  ownerEmail: string,
  options: InboxBootstrapOptions = {},
): Promise<User[]> {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const locks = getBootstrapLocks();
  const existingLock = locks.get(normalizedOwnerEmail);
  if (existingLock) {
    return existingLock;
  }

  const bootstrapPromise = (async (): Promise<User[]> => {
    const accounts = await getConnectedInstagramAccounts(normalizedOwnerEmail);
    if (accounts.length === 0) {
      return [];
    }

    let conversations = await getConversationsFromDb(normalizedOwnerEmail);
    if (conversations.length === 0) {
      conversations = await syncWorkspaceConversationsFromGraph(
        normalizedOwnerEmail,
        options,
      );
    }

    if (conversations.length === 0) {
      return [];
    }

    await syncMessagesForRecentConversations(
      normalizedOwnerEmail,
      conversations,
      accounts,
    );

    return getConversationsFromDb(normalizedOwnerEmail);
  })().finally(() => {
    const currentLock = locks.get(normalizedOwnerEmail);
    if (currentLock === bootstrapPromise) {
      locks.delete(normalizedOwnerEmail);
    }
  });

  locks.set(normalizedOwnerEmail, bootstrapPromise);
  return bootstrapPromise;
}
