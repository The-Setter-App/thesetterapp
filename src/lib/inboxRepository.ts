import clientPromise from '@/lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';
import { User, Message, ConversationDetails, PaymentDetails, ConversationTimelineEvent, StatusType, ConversationContactDetails } from '@/types/inbox';

const DB_NAME = 'thesetterapp';
const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';
const SYNC_COLLECTION = 'inbox_sync_jobs';
const AUDIO_BUCKET = 'voice_notes';

const DEFAULT_PAYMENT_DETAILS: PaymentDetails = {
  amount: '',
  paymentMethod: 'Fanbasis',
  payOption: 'One Time',
  paymentFrequency: 'One Time',
  setterPaid: 'No',
  closerPaid: 'No',
  paymentNotes: '',
};

const DEFAULT_CONTACT_DETAILS: ConversationContactDetails = {
  phoneNumber: '',
  email: '',
};
const EMPTY_PREVIEW = 'No messages yet';

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
    const docs = await db
      .collection<User>(CONVERSATIONS_COLLECTION)
      .find({ ownerEmail } as any)
      .sort({ updatedAt: -1, id: -1 })
      .toArray();
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
  const existing = await db.collection(CONVERSATIONS_COLLECTION).findOne({ id: conversation.id, ownerEmail });
  
  // Exclude unread from $set so we don't overwrite local unread counts with 0 from API
  // Also exclude avatar if it is null to prevent overwriting existing avatars with null
  const { unread, avatar, ...rest } = conversation;

  const setPayload: any = { ...rest, ownerEmail };
  if (avatar) {
    setPayload.avatar = avatar;
  }
  if (existing?.updatedAt && rest.updatedAt) {
    const existingMs = Date.parse(existing.updatedAt);
    const incomingMs = Date.parse(rest.updatedAt);
    if (Number.isFinite(existingMs) && Number.isFinite(incomingMs) && existingMs > incomingMs) {
      setPayload.updatedAt = existing.updatedAt;
    }
  } else if (existing?.updatedAt && !rest.updatedAt) {
    setPayload.updatedAt = existing.updatedAt;
  }
  const incomingPreview = typeof rest.lastMessage === 'string' ? rest.lastMessage.trim() : '';
  const existingPreview = typeof existing?.lastMessage === 'string' ? existing.lastMessage.trim() : '';
  if ((incomingPreview === '' || incomingPreview === EMPTY_PREVIEW) && existingPreview && existingPreview !== EMPTY_PREVIEW) {
    setPayload.lastMessage = existingPreview;
    if (typeof existing?.time === 'string' && existing.time.trim()) {
      setPayload.time = existing.time;
    }
  }
  if (existing && typeof existing.status === 'string') {
    setPayload.status = existing.status;
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
    if (existing?.updatedAt && rest.updatedAt) {
      const existingMs = Date.parse(existing.updatedAt);
      const incomingMs = Date.parse(rest.updatedAt);
      if (Number.isFinite(existingMs) && Number.isFinite(incomingMs) && existingMs > incomingMs) {
        setPayload.updatedAt = existing.updatedAt;
      }
    } else if (existing?.updatedAt && !rest.updatedAt) {
      setPayload.updatedAt = existing.updatedAt;
    }

    if (existing && existing.status) {
      setPayload.status = existing.status;
    }
    const incomingPreview = typeof rest.lastMessage === 'string' ? rest.lastMessage.trim() : '';
    const existingPreview = typeof existing?.lastMessage === 'string' ? existing.lastMessage.trim() : '';
    if ((incomingPreview === '' || incomingPreview === EMPTY_PREVIEW) && existingPreview && existingPreview !== EMPTY_PREVIEW) {
      setPayload.lastMessage = existingPreview;
      if (typeof existing?.time === 'string' && existing.time.trim()) {
        setPayload.time = existing.time;
      }
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

export async function findConversationById(conversationId: string, ownerEmail: string): Promise<User | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);
  const user = await db.collection<User>(CONVERSATIONS_COLLECTION).findOne({ id: conversationId, ownerEmail });

  if (!user) return null;
  const { _id, ...rest } = user as any;
  return rest as User;
}

/**
 * Find a conversation ID by the other participant's ID
 */
export async function findConversationIdByParticipant(participantId: string, ownerEmail: string): Promise<string | undefined> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);
  const conv = await db.collection<User>(CONVERSATIONS_COLLECTION).findOne({
    recipientId: participantId,
    ownerEmail,
  });
  if (!conv) return undefined;
  return conv.id;
}

export async function findConversationIdByParticipantAndAccount(
  participantId: string,
  ownerEmail: string,
  ownerInstagramUserId: string
): Promise<string | undefined> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);
  const conv = await db.collection<User>(CONVERSATIONS_COLLECTION).findOne({
    recipientId: participantId,
    ownerEmail,
    ownerInstagramUserId,
  });
  return conv?.id;
}

export async function findConversationIdByParticipantUnique(
  participantId: string,
  ownerEmail: string
): Promise<string | undefined> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);
  const docs = await db
    .collection<User>(CONVERSATIONS_COLLECTION)
    .find({ recipientId: participantId, ownerEmail })
    .project({ id: 1 })
    .limit(2)
    .toArray();

  // Only return a fallback match when unambiguous.
  if (docs.length !== 1) return undefined;
  return docs[0]?.id;
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

function getAudioBucket(db: any): GridFSBucket {
  return new GridFSBucket(db, { bucketName: AUDIO_BUCKET });
}

export async function saveVoiceNoteBlobToGridFs(params: {
  ownerEmail: string;
  conversationId: string;
  recipientId: string;
  messageId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<{ fileId: string; mimeType: string; size: number }> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);
  const bucket = getAudioBucket(db);

  const uploadStream = bucket.openUploadStream(params.fileName, {
    metadata: {
      ownerEmail: params.ownerEmail,
      conversationId: params.conversationId,
      recipientId: params.recipientId,
      messageId: params.messageId,
      mimeType: params.mimeType,
    },
  });

  await new Promise<void>((resolve, reject) => {
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve());
    uploadStream.end(params.bytes);
  });

  return {
    fileId: uploadStream.id.toString(),
    mimeType: params.mimeType,
    size: params.bytes.length,
  };
}

export async function saveOrUpdateLocalAudioMessage(params: {
  ownerEmail: string;
  conversationId: string;
  recipientId: string;
  messageId: string;
  clientTempId?: string;
  timestamp: string;
  duration?: string;
  audioStorage: {
    kind: 'gridfs';
    fileId: string;
    mimeType: string;
    size: number;
  };
}): Promise<Message> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  const baseAttachmentUrl = `/api/inbox/messages/${encodeURIComponent(params.messageId)}/audio`;
  const baseMessage: Message = {
    id: params.messageId,
    clientTempId: params.clientTempId,
    fromMe: true,
    type: 'audio',
    text: '',
    timestamp: params.timestamp,
    duration: params.duration,
    attachmentUrl: baseAttachmentUrl,
    source: 'local_audio_fallback',
    audioStorage: params.audioStorage,
  };

  let existing: Message | null = null;
  if (params.clientTempId) {
    existing = await db.collection<Message>(MESSAGES_COLLECTION).findOne({
      ownerEmail: params.ownerEmail,
      conversationId: params.conversationId,
      clientTempId: params.clientTempId,
    } as any);
  }

  if (!existing) {
    const fiveMinutesAgoIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    existing = await db.collection<Message>(MESSAGES_COLLECTION).findOne({
      ownerEmail: params.ownerEmail,
      conversationId: params.conversationId,
      fromMe: true,
      type: 'audio',
      source: { $ne: 'local_audio_fallback' },
      timestamp: { $gte: fiveMinutesAgoIso },
    } as any, { sort: { timestamp: -1 } });
  }

  if (existing?.id) {
    const mergedAttachmentUrl = `/api/inbox/messages/${encodeURIComponent(existing.id)}/audio`;
    const merged: Message = {
      ...existing,
      ...baseMessage,
      id: existing.id,
      timestamp: existing.timestamp || params.timestamp,
      attachmentUrl: mergedAttachmentUrl,
    };
    await db.collection(MESSAGES_COLLECTION).updateOne(
      { id: existing.id, ownerEmail: params.ownerEmail },
      { $set: { ...merged, conversationId: params.conversationId, ownerEmail: params.ownerEmail } },
      { upsert: true }
    );
    return merged;
  }

  await saveMessageToDb(baseMessage, params.conversationId, params.ownerEmail);
  return baseMessage;
}

export async function getVoiceNoteStreamForMessage(
  messageId: string,
  ownerEmail: string
): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; size: number } | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  const message = await db.collection<Message>(MESSAGES_COLLECTION).findOne({ id: messageId, ownerEmail } as any);
  const fileId = message?.audioStorage?.fileId;
  if (!fileId) return null;

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(fileId);
  } catch {
    return null;
  }

  const bucket = getAudioBucket(db);
  const files = await bucket.find({ _id: objectId, 'metadata.ownerEmail': ownerEmail }).toArray();
  const file = files[0];
  if (!file) return null;

  const fileMime = (file.metadata as { mimeType?: string } | undefined)?.mimeType;

  return {
    stream: bucket.openDownloadStream(objectId),
    mimeType: fileMime || message.audioStorage?.mimeType || 'audio/webm',
    size: typeof file.length === 'number' ? file.length : message.audioStorage?.size || 0,
  };
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
  clearUnread = false,
  eventTimestampIso?: string
): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  const update: any = {
    $set: {
      lastMessage,
      time,
      updatedAt: eventTimestampIso || new Date().toISOString(),
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
  conversationId: string,
  ownerEmail: string,
  newStatus: string
): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  await db.collection(CONVERSATIONS_COLLECTION).updateOne(
    { id: conversationId, ownerEmail },
    { $set: { status: newStatus } }
  );
}

/**
 * Update user avatar
 */
export async function updateUserAvatar(
  conversationId: string,
  ownerEmail: string,
  avatarUrl: string
): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  await db.collection(CONVERSATIONS_COLLECTION).updateOne(
    { id: conversationId, ownerEmail },
    { $set: { avatar: avatarUrl } }
  );
}

export async function getConversationDetails(
  conversationId: string,
  ownerEmail: string
): Promise<ConversationDetails | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  const doc = await db.collection(CONVERSATIONS_COLLECTION).findOne(
    { id: conversationId, ownerEmail },
    { projection: { notes: 1, paymentDetails: 1, timelineEvents: 1, contactDetails: 1 } }
  );

  if (!doc) return null;

  const notes = typeof (doc as { notes?: unknown }).notes === 'string'
    ? (doc as { notes?: string }).notes || ''
    : '';
  const payment = (doc as { paymentDetails?: Partial<PaymentDetails> }).paymentDetails || {};
  const rawTimeline = (doc as { timelineEvents?: unknown }).timelineEvents;
  const contact = (doc as { contactDetails?: Partial<ConversationContactDetails> }).contactDetails || {};
  const timelineEvents: ConversationTimelineEvent[] = Array.isArray(rawTimeline)
    ? rawTimeline
        .map((event) => {
          const e = event as Partial<ConversationTimelineEvent>;
          if (
            typeof e.id !== 'string' ||
            e.type !== 'status_update' ||
            typeof e.status !== 'string' ||
            typeof e.title !== 'string' ||
            typeof e.sub !== 'string' ||
            typeof e.timestamp !== 'string'
          ) {
            return null;
          }
          return e as ConversationTimelineEvent;
        })
        .filter((event): event is ConversationTimelineEvent => event !== null)
    : [];

  return {
    notes,
    paymentDetails: {
      amount: typeof payment.amount === 'string' ? payment.amount : DEFAULT_PAYMENT_DETAILS.amount,
      paymentMethod: typeof payment.paymentMethod === 'string' ? payment.paymentMethod : DEFAULT_PAYMENT_DETAILS.paymentMethod,
      payOption: typeof payment.payOption === 'string' ? payment.payOption : DEFAULT_PAYMENT_DETAILS.payOption,
      paymentFrequency: typeof payment.paymentFrequency === 'string' ? payment.paymentFrequency : DEFAULT_PAYMENT_DETAILS.paymentFrequency,
      setterPaid: payment.setterPaid === 'Yes' ? 'Yes' : DEFAULT_PAYMENT_DETAILS.setterPaid,
      closerPaid: payment.closerPaid === 'Yes' ? 'Yes' : DEFAULT_PAYMENT_DETAILS.closerPaid,
      paymentNotes: typeof payment.paymentNotes === 'string' ? payment.paymentNotes : DEFAULT_PAYMENT_DETAILS.paymentNotes,
    },
    timelineEvents,
    contactDetails: {
      phoneNumber: typeof contact.phoneNumber === 'string' ? contact.phoneNumber : DEFAULT_CONTACT_DETAILS.phoneNumber,
      email: typeof contact.email === 'string' ? contact.email : DEFAULT_CONTACT_DETAILS.email,
    },
  };
}

export async function updateConversationDetails(
  conversationId: string,
  ownerEmail: string,
  details: Partial<ConversationDetails>
): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  const setPayload: Record<string, unknown> = {};

  if (typeof details.notes === 'string') {
    setPayload.notes = details.notes;
  }

  if (details.paymentDetails) {
    const payment = details.paymentDetails;
    if (typeof payment.amount === 'string') setPayload['paymentDetails.amount'] = payment.amount;
    if (typeof payment.paymentMethod === 'string') setPayload['paymentDetails.paymentMethod'] = payment.paymentMethod;
    if (typeof payment.payOption === 'string') setPayload['paymentDetails.payOption'] = payment.payOption;
    if (typeof payment.paymentFrequency === 'string') setPayload['paymentDetails.paymentFrequency'] = payment.paymentFrequency;
    if (payment.setterPaid === 'Yes' || payment.setterPaid === 'No') setPayload['paymentDetails.setterPaid'] = payment.setterPaid;
    if (payment.closerPaid === 'Yes' || payment.closerPaid === 'No') setPayload['paymentDetails.closerPaid'] = payment.closerPaid;
    if (typeof payment.paymentNotes === 'string') setPayload['paymentDetails.paymentNotes'] = payment.paymentNotes;
  }

  if (Array.isArray(details.timelineEvents)) {
    setPayload.timelineEvents = details.timelineEvents;
  }

  if (details.contactDetails) {
    const contact = details.contactDetails;
    if (typeof contact.phoneNumber === 'string') setPayload['contactDetails.phoneNumber'] = contact.phoneNumber;
    if (typeof contact.email === 'string') setPayload['contactDetails.email'] = contact.email;
  }

  if (Object.keys(setPayload).length === 0) return;

  await db.collection(CONVERSATIONS_COLLECTION).updateOne(
    { id: conversationId, ownerEmail },
    { $set: setPayload }
  );
}

export async function addStatusTimelineEvent(
  conversationId: string,
  ownerEmail: string,
  status: StatusType
): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);

  const timestamp = new Date().toISOString();
  const event: ConversationTimelineEvent = {
    id: `status_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'status_update',
    status,
    title: status,
    sub: `Status changed to ${status}`,
    timestamp,
  };

  await db.collection(CONVERSATIONS_COLLECTION).updateOne(
    { id: conversationId, ownerEmail },
    {
      $push: { timelineEvents: event },
    } as any
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
