import clientPromise from '@/lib/mongodb';
import { User, Message } from '@/types/inbox';

const DB_NAME = 'thesetterapp';
const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';
const SYNC_COLLECTION = 'inbox_sync_jobs';

let indexesReady = false;

async function ensureInboxIndexes(db: any) {
  if (indexesReady) return;

  const results = await Promise.allSettled([
    db.collection(MESSAGES_COLLECTION).createIndex(
      { ownerEmail: 1, id: 1 },
      { unique: true }
    ),
    db.collection(MESSAGES_COLLECTION).createIndex({ ownerEmail: 1, conversationId: 1, timestamp: -1, id: -1 }),
    db.collection(CONVERSATIONS_COLLECTION).createIndex({ ownerEmail: 1, recipientId: 1 }),
    db.collection(CONVERSATIONS_COLLECTION).createIndex({ ownerEmail: 1, id: 1 }),
    db.collection(SYNC_COLLECTION).createIndex({ ownerEmail: 1 }, { unique: true }),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      const mongoCode = (result.reason as { code?: number } | undefined)?.code;
      // Safe to ignore existing-index naming conflicts from older deployments.
      if (mongoCode === 85) continue;
      console.warn('[InboxRepo] Failed to create one or more indexes:', result.reason);
    }
  }

  indexesReady = true;
}

/**
 * Get all conversations from MongoDB for a specific owner
 */
export async function getConversationsFromDb(ownerEmail: string): Promise<User[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await ensureInboxIndexes(db);
    // Filter by ownerEmail
    const docs = await db.collection<User>(CONVERSATIONS_COLLECTION).find({ ownerEmail } as any).toArray();
    // Sanitize _id for Client Components
    return docs.map(({ _id, ...rest }: any) => rest as User);
  } catch (error) {
    console.error('[InboxRepo] Error fetching conversations:', error);
    return [];
  }
}

/**
 * Save or update a single conversation in MongoDB
 */
export async function saveConversationToDb(conversation: User, ownerEmail: string): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);
  
  // Exclude unread from $set so we don't overwrite local unread counts with 0 from API
  // Also exclude avatar if it is null to prevent overwriting existing avatars with null
  const { unread, avatar, ...rest } = conversation;

  const setPayload: any = { ...rest, ownerEmail };
  if (avatar) {
    setPayload.avatar = avatar;
  }

  await db.collection(CONVERSATIONS_COLLECTION).updateOne(
    { id: conversation.id, ownerEmail },
    { 
      $set: setPayload,
      $setOnInsert: { unread: 0 }
    },
    { upsert: true }
  );
}

/**
 * Bulk save conversations to MongoDB
 */
export async function saveConversationsToDb(conversations: User[], ownerEmail: string): Promise<void> {
  if (conversations.length === 0) return;
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  const operations = await Promise.all(conversations.map(async conv => {
    // Exclude unread from $set so we don't overwrite local unread counts with 0 from API
    // Also exclude avatar if it is null
    const { unread, avatar, ...rest } = conv;
    
    // Preserve custom status if already set in DB
    const existing = await db.collection(CONVERSATIONS_COLLECTION).findOne({ id: conv.id, ownerEmail });
    
    const setPayload: any = { ...rest, ownerEmail };
    if (avatar) {
      setPayload.avatar = avatar;
    }

    if (existing && existing.status) {
      setPayload.status = existing.status;
    }
    
    return {
      updateOne: {
        filter: { id: conv.id, ownerEmail },
        update: {
          $set: setPayload,
          $setOnInsert: { unread: 0 }
        },
        upsert: true
      }
    };
  }));

  await db.collection(CONVERSATIONS_COLLECTION).bulkWrite(operations);
}

/**
 * Find a conversation by the other participant's user ID (recipientId).
 * Returns the full User object, or null if not found.
 */
export async function findConversationByRecipientId(recipientId: string, ownerEmail: string): Promise<User | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);
  const user = await db.collection<User>(CONVERSATIONS_COLLECTION).findOne({ recipientId, ownerEmail });

  if (!user) return null;

  // Sanitize _id
  const { _id, ...rest } = user as any;
  return rest as User;
}

/**
 * Find a conversation ID by the other participant's ID
 */
export async function findConversationIdByParticipant(participantId: string, ownerEmail: string): Promise<string | undefined> {
  const conv = await findConversationByRecipientId(participantId, ownerEmail);
  return conv?.id;
}

/**
 * Get messages for a conversation from MongoDB
 */
export async function getMessagesFromDb(conversationId: string, ownerEmail: string): Promise<Message[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await ensureInboxIndexes(db);
    // Filter by conversationId AND ownerEmail for isolation
    const docs = await db.collection<Message>(MESSAGES_COLLECTION)
      .find({ conversationId, ownerEmail } as any) 
      .sort({ timestamp: 1 })
      .toArray();

    // Sanitize _id for Client Components
    return docs.map(({ _id, ...rest }: any) => rest as Message);
  } catch (error) {
    console.error(`[InboxRepo] Error fetching messages for ${conversationId}:`, error);
    return [];
  }
}

/**
 * Save a single message to MongoDB
 */
export async function saveMessageToDb(message: Message, conversationId: string, ownerEmail: string): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);
  await db.collection(MESSAGES_COLLECTION).updateOne(
    { id: message.id, ownerEmail },
    { $set: { ...message, conversationId, ownerEmail } },
    { upsert: true }
  );
}

/**
 * Bulk save messages to MongoDB
 */
export async function saveMessagesToDb(messages: Message[], conversationId: string, ownerEmail: string): Promise<void> {
  if (messages.length === 0) return;
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  const operations = messages.map(msg => ({
    updateOne: {
      filter: { id: msg.id, ownerEmail },
      update: { $set: { ...msg, conversationId, ownerEmail } },
      upsert: true
    }
  }));

  await db.collection(MESSAGES_COLLECTION).bulkWrite(operations);
}

type MessageCursor = {
  timestamp: string;
  id: string;
};

export function encodeMessagesCursor(cursor: MessageCursor): string {
  const raw = JSON.stringify(cursor);
  return Buffer.from(raw, 'utf8').toString('base64url');
}

export function decodeMessagesCursor(cursor: string): MessageCursor | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as MessageCursor;
    if (!parsed?.timestamp || !parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function buildCursorFilter(cursor: MessageCursor) {
  return {
    $or: [
      { timestamp: { $lt: cursor.timestamp } },
      { timestamp: cursor.timestamp, id: { $lt: cursor.id } },
    ],
  };
}

export async function getMessagesPageFromDb(
  conversationId: string,
  ownerEmail: string,
  limit: number,
  cursor?: string
): Promise<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  const parsedCursor = cursor ? decodeMessagesCursor(cursor) : null;
  const baseFilter: any = {
    conversationId,
    ownerEmail,
    isEmpty: { $ne: true },
    timestamp: { $exists: true, $type: 'string' },
  };

  const filter = parsedCursor
    ? { ...baseFilter, ...buildCursorFilter(parsedCursor) }
    : baseFilter;

  const docs = await db
    .collection<Message>(MESSAGES_COLLECTION)
    .find(filter)
    .sort({ timestamp: -1, id: -1 })
    .limit(limit)
    .toArray();

  const sanitized = docs.map(({ _id, ...rest }: any) => rest as Message);
  const newestToOldest = sanitized;
  const oldestToNewest = [...newestToOldest].reverse();
  const last = newestToOldest[newestToOldest.length - 1];

  if (!last?.timestamp) {
    return {
      messages: oldestToNewest,
      nextCursor: null,
      hasMore: false,
    };
  }

  const nextCursor = encodeMessagesCursor({ timestamp: last.timestamp, id: last.id });

  const hasMoreFilter = {
    ...baseFilter,
    ...buildCursorFilter({ timestamp: last.timestamp, id: last.id }),
  };
  const nextOne = await db.collection(MESSAGES_COLLECTION).findOne(hasMoreFilter);

  return {
    messages: oldestToNewest,
    nextCursor: nextOne ? nextCursor : null,
    hasMore: Boolean(nextOne),
  };
}

/**
 * Update conversation metadata (last message, time, unread count)
 */
export async function updateConversationMetadata(
  conversationId: string,
  ownerEmail: string,
  lastMessage: string,
  time: string,
  incrementUnread: boolean,
  clearUnread = false
): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  const update: any = {
    $set: {
      lastMessage,
      time,
    },
  };

  if (incrementUnread) {
    update.$inc = { unread: 1 };
  }

  if (clearUnread) {
    update.$set.unread = 0;
  }

  await db.collection(CONVERSATIONS_COLLECTION).updateOne(
    { id: conversationId, ownerEmail },
    update
  );
}

/**
 * Update user status by recipientId
 */
export async function updateUserStatus(
  recipientId: string,
  ownerEmail: string,
  newStatus: string
): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  await db.collection(CONVERSATIONS_COLLECTION).updateOne(
    { recipientId, ownerEmail },
    { $set: { status: newStatus } }
  );
}

/**
 * Update user avatar
 */
export async function updateUserAvatar(
  recipientId: string,
  ownerEmail: string,
  avatarUrl: string
): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  await db.collection(CONVERSATIONS_COLLECTION).updateOne(
    { recipientId, ownerEmail },
    { $set: { avatar: avatarUrl } }
  );
}

export async function getConversationGraphSyncState(
  conversationId: string,
  ownerEmail: string
): Promise<{ graphBeforeCursor?: string; graphBackfillDone?: boolean }> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  const doc = await db.collection(CONVERSATIONS_COLLECTION).findOne(
    { id: conversationId, ownerEmail },
    { projection: { graphBeforeCursor: 1, graphBackfillDone: 1, syncBeforeCursor: 1, syncStatus: 1 } }
  );

  if (!doc) return {};

  return {
    graphBeforeCursor:
      typeof (doc as { syncBeforeCursor?: unknown }).syncBeforeCursor === 'string'
        ? (doc as { syncBeforeCursor?: string }).syncBeforeCursor
        : typeof (doc as { graphBeforeCursor?: unknown }).graphBeforeCursor === 'string'
        ? (doc as { graphBeforeCursor?: string }).graphBeforeCursor
        : undefined,
    graphBackfillDone:
      (doc as { syncStatus?: string }).syncStatus === 'done'
        ? true
        : typeof (doc as { graphBackfillDone?: unknown }).graphBackfillDone === 'boolean'
        ? (doc as { graphBackfillDone?: boolean }).graphBackfillDone
        : undefined,
  };
}

export async function updateConversationGraphSyncState(
  conversationId: string,
  ownerEmail: string,
  state: { graphBeforeCursor?: string; graphBackfillDone?: boolean }
): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  const setPayload: Record<string, unknown> = {};
  if (state.graphBeforeCursor !== undefined) {
    setPayload.graphBeforeCursor = state.graphBeforeCursor;
    setPayload.syncBeforeCursor = state.graphBeforeCursor;
  }
  if (state.graphBackfillDone !== undefined) {
    setPayload.graphBackfillDone = state.graphBackfillDone;
    setPayload.syncStatus = state.graphBackfillDone ? 'done' : 'running';
    if (state.graphBackfillDone) {
      setPayload.syncCompletedAt = new Date().toISOString();
    }
  }
  if (Object.keys(setPayload).length === 0) return;

  await db.collection(CONVERSATIONS_COLLECTION).updateOne(
    { id: conversationId, ownerEmail },
    { $set: setPayload }
  );
}

export type ConversationSyncStatus = 'pending' | 'running' | 'done' | 'error';

export type ConversationSyncState = {
  syncStatus?: ConversationSyncStatus;
  syncBeforeCursor?: string;
  syncCompletedAt?: string;
  syncStartedAt?: string;
  syncError?: string;
  syncRetryCount?: number;
  syncMessageCount?: number;
};

export async function updateConversationSyncState(
  conversationId: string,
  ownerEmail: string,
  state: ConversationSyncState
): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  const setPayload: Record<string, unknown> = {};
  if (state.syncStatus !== undefined) setPayload.syncStatus = state.syncStatus;
  if (state.syncBeforeCursor !== undefined) {
    setPayload.syncBeforeCursor = state.syncBeforeCursor;
    setPayload.graphBeforeCursor = state.syncBeforeCursor;
  }
  if (state.syncCompletedAt !== undefined) setPayload.syncCompletedAt = state.syncCompletedAt;
  if (state.syncStartedAt !== undefined) setPayload.syncStartedAt = state.syncStartedAt;
  if (state.syncError !== undefined) setPayload.syncError = state.syncError;
  if (state.syncRetryCount !== undefined) setPayload.syncRetryCount = state.syncRetryCount;
  if (state.syncMessageCount !== undefined) setPayload.syncMessageCount = state.syncMessageCount;
  if (Object.keys(setPayload).length === 0) return;

  await db.collection(CONVERSATIONS_COLLECTION).updateOne(
    { id: conversationId, ownerEmail },
    { $set: setPayload },
    { upsert: false }
  );
}

export async function getConversationSyncState(
  conversationId: string,
  ownerEmail: string
): Promise<ConversationSyncState | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);
  const doc = await db.collection(CONVERSATIONS_COLLECTION).findOne(
    { id: conversationId, ownerEmail },
    {
      projection: {
        syncStatus: 1,
        syncBeforeCursor: 1,
        syncCompletedAt: 1,
        syncStartedAt: 1,
        syncError: 1,
        syncRetryCount: 1,
        syncMessageCount: 1,
      },
    }
  );

  if (!doc) return null;

  return {
    syncStatus: typeof (doc as { syncStatus?: unknown }).syncStatus === 'string'
      ? (doc as { syncStatus?: ConversationSyncStatus }).syncStatus
      : undefined,
    syncBeforeCursor: typeof (doc as { syncBeforeCursor?: unknown }).syncBeforeCursor === 'string'
      ? (doc as { syncBeforeCursor?: string }).syncBeforeCursor
      : undefined,
    syncCompletedAt: typeof (doc as { syncCompletedAt?: unknown }).syncCompletedAt === 'string'
      ? (doc as { syncCompletedAt?: string }).syncCompletedAt
      : undefined,
    syncStartedAt: typeof (doc as { syncStartedAt?: unknown }).syncStartedAt === 'string'
      ? (doc as { syncStartedAt?: string }).syncStartedAt
      : undefined,
    syncError: typeof (doc as { syncError?: unknown }).syncError === 'string'
      ? (doc as { syncError?: string }).syncError
      : undefined,
    syncRetryCount: typeof (doc as { syncRetryCount?: unknown }).syncRetryCount === 'number'
      ? (doc as { syncRetryCount?: number }).syncRetryCount
      : undefined,
    syncMessageCount: typeof (doc as { syncMessageCount?: unknown }).syncMessageCount === 'number'
      ? (doc as { syncMessageCount?: number }).syncMessageCount
      : undefined,
  };
}

export async function markConversationsPendingSync(
  ownerEmail: string,
  conversationIds: string[]
): Promise<void> {
  if (!conversationIds.length) return;
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);
  await db.collection(CONVERSATIONS_COLLECTION).updateMany(
    { ownerEmail, id: { $in: conversationIds } },
    {
      $set: { syncStatus: 'pending' },
      $setOnInsert: { syncRetryCount: 0, syncMessageCount: 0 },
    }
  );
}

export type InboxSyncJobState = {
  ownerEmail: string;
  inProgress: boolean;
  totalConversations: number;
  completedConversations: number;
  failedConversations: number;
  lastStartedAt?: string;
  lastCompletedAt?: string;
  lastError?: string;
  heartbeatAt?: string;
};

export async function getInboxSyncJob(ownerEmail: string): Promise<InboxSyncJobState | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);
  const doc = await db.collection<InboxSyncJobState>(SYNC_COLLECTION).findOne({ ownerEmail });
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  return rest as InboxSyncJobState;
}

export async function upsertInboxSyncJob(
  ownerEmail: string,
  updates: Partial<InboxSyncJobState>
): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);
  await db.collection(SYNC_COLLECTION).updateOne(
    { ownerEmail },
    { $set: { ...updates, ownerEmail } },
    { upsert: true }
  );
}

export async function getConversationSyncOverview(ownerEmail: string): Promise<{
  total: number;
  pending: number;
  running: number;
  done: number;
  error: number;
}> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  const [total, pending, running, done, error] = await Promise.all([
    db.collection(CONVERSATIONS_COLLECTION).countDocuments({ ownerEmail }),
    db.collection(CONVERSATIONS_COLLECTION).countDocuments({ ownerEmail, syncStatus: 'pending' }),
    db.collection(CONVERSATIONS_COLLECTION).countDocuments({ ownerEmail, syncStatus: 'running' }),
    db.collection(CONVERSATIONS_COLLECTION).countDocuments({ ownerEmail, syncStatus: 'done' }),
    db.collection(CONVERSATIONS_COLLECTION).countDocuments({ ownerEmail, syncStatus: 'error' }),
  ]);

  return { total, pending, running, done, error };
}
