import clientPromise from '@/lib/mongodb';
import { User, Message } from '@/types/inbox';

const DB_NAME = 'thesetterapp';
const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

/**
 * Get all conversations from MongoDB for a specific owner
 */
export async function getConversationsFromDb(ownerEmail: string): Promise<User[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
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
  
  // Exclude unread from $set so we don't overwrite local unread counts with 0 from API
  const { unread, ...conversationWithoutUnread } = conversation;

  await db.collection(CONVERSATIONS_COLLECTION).updateOne(
    { id: conversation.id, ownerEmail },
    { 
      $set: { ...conversationWithoutUnread, ownerEmail },
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

  const operations = await Promise.all(conversations.map(async conv => {
    // Exclude unread from $set so we don't overwrite local unread counts with 0 from API
    const { unread, ...convWithoutUnread } = conv;
    // Preserve custom status if already set in DB
    const existing = await db.collection(CONVERSATIONS_COLLECTION).findOne({ id: conv.id, ownerEmail });
    if (existing && existing.status) {
      convWithoutUnread.status = existing.status;
    }
    return {
      updateOne: {
        filter: { id: conv.id, ownerEmail },
        update: {
          $set: { ...convWithoutUnread, ownerEmail },
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

  const operations = messages.map(msg => ({
    updateOne: {
      filter: { id: msg.id, ownerEmail },
      update: { $set: { ...msg, conversationId, ownerEmail } },
      upsert: true
    }
  }));

  await db.collection(MESSAGES_COLLECTION).bulkWrite(operations);
}

/**
 * Update conversation metadata (last message, time, unread count)
 */
export async function updateConversationMetadata(
  conversationId: string,
  ownerEmail: string,
  lastMessage: string,
  time: string,
  incrementUnread: boolean
): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const update: any = {
    $set: {
      lastMessage,
      time,
    },
  };

  if (incrementUnread) {
    update.$inc = { unread: 1 };
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

  await db.collection(CONVERSATIONS_COLLECTION).updateOne(
    { recipientId, ownerEmail },
    { $set: { status: newStatus } }
  );
}