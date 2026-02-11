import clientPromise from '@/lib/mongodb';
import { User, Message } from '@/types/inbox';

const DB_NAME = 'thesetterapp';
const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

/**
 * Get all conversations from MongoDB
 */
export async function getConversationsFromDb(): Promise<User[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    // Sort by most recent time (approximation using time string, ideally use timestamp)
    // Note: 'time' field is "HH:MM AM/PM", which doesn't sort chronologically across days.
    // For now, we return as is. The UI might handle sorting or we rely on insertion order if we don't update often.
    // A better approach would be to store a raw timestamp in User.
    return db.collection<User>(CONVERSATIONS_COLLECTION).find({}).toArray();
  } catch (error) {
    console.error('[InboxRepo] Error fetching conversations:', error);
    return [];
  }
}

/**
 * Save or update a single conversation in MongoDB
 */
export async function saveConversationToDb(conversation: User): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  
  // Exclude unread from $set so we don't overwrite local unread counts with 0 from API
  const { unread, ...conversationWithoutUnread } = conversation;

  await db.collection(CONVERSATIONS_COLLECTION).updateOne(
    { id: conversation.id },
    { 
      $set: conversationWithoutUnread,
      $setOnInsert: { unread: 0 }
    },
    { upsert: true }
  );
}

/**
 * Bulk save conversations to MongoDB
 */
export async function saveConversationsToDb(conversations: User[]): Promise<void> {
  if (conversations.length === 0) return;
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  
  const operations = conversations.map(conv => {
    // Exclude unread from $set so we don't overwrite local unread counts with 0 from API
    const { unread, ...convWithoutUnread } = conv;
    return {
      updateOne: {
        filter: { id: conv.id },
        update: { 
          $set: convWithoutUnread,
          $setOnInsert: { unread: 0 }
        },
        upsert: true
      }
    };
  });
  
  await db.collection(CONVERSATIONS_COLLECTION).bulkWrite(operations);
}

/**
 * Find a conversation by the other participant's user ID (recipientId).
 * Returns the full User object, or null if not found.
 */
export async function findConversationByRecipientId(recipientId: string): Promise<User | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<User>(CONVERSATIONS_COLLECTION).findOne({ recipientId });
}

/**
 * Find a conversation ID by the other participant's ID
 */
export async function findConversationIdByParticipant(participantId: string): Promise<string | undefined> {
  const conv = await findConversationByRecipientId(participantId);
  return conv?.id;
}

/**
 * Get messages for a conversation from MongoDB
 */
export async function getMessagesFromDb(conversationId: string): Promise<Message[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    // Filter by conversationId and sort by timestamp (oldest first for chat history)
    return db.collection<Message>(MESSAGES_COLLECTION)
      .find({ conversationId } as any) 
      .sort({ timestamp: 1 })
      .toArray();
  } catch (error) {
    console.error(`[InboxRepo] Error fetching messages for ${conversationId}:`, error);
    return [];
  }
}

/**
 * Save a single message to MongoDB
 */
export async function saveMessageToDb(message: Message, conversationId: string): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await db.collection(MESSAGES_COLLECTION).updateOne(
    { id: message.id },
    { $set: { ...message, conversationId } },
    { upsert: true }
  );
}

/**
 * Bulk save messages to MongoDB
 */
export async function saveMessagesToDb(messages: Message[], conversationId: string): Promise<void> {
  if (messages.length === 0) return;
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const operations = messages.map(msg => ({
    updateOne: {
      filter: { id: msg.id },
      update: { $set: { ...msg, conversationId } },
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
    { id: conversationId },
    update
  );
}