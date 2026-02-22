import { getInboxDb, MESSAGES_COLLECTION } from "@/lib/inbox/repository/core";
import type { Message } from "@/types/inbox";

type MessageDoc = Message & {
  id: string;
  ownerEmail: string;
  conversationId: string;
  timestamp?: string;
  isEmpty?: boolean;
};

type MessageCursor = {
  timestamp: string;
  id: string;
};

/**
 * Get messages for a conversation from MongoDB
 */
export async function getMessagesFromDb(
  conversationId: string,
  ownerEmail: string,
): Promise<Message[]> {
  try {
    const db = await getInboxDb();
    // Filter by conversationId AND ownerEmail for isolation
    const docs = await db
      .collection<MessageDoc>(MESSAGES_COLLECTION)
      .find({ conversationId, ownerEmail })
      .sort({ timestamp: 1 })
      .toArray();

    // Sanitize _id for Client Components
    return docs.map((doc) => {
      const { _id: _ignored, ...rest } = doc as MessageDoc & { _id?: unknown };
      return rest as Message;
    });
  } catch (error) {
    console.error(
      `[InboxRepo] Error fetching messages for ${conversationId}:`,
      error,
    );
    return [];
  }
}

/**
 * Save a single message to MongoDB
 */
export async function saveMessageToDb(
  message: Message,
  conversationId: string,
  ownerEmail: string,
): Promise<void> {
  const db = await getInboxDb();
  await db
    .collection(MESSAGES_COLLECTION)
    .updateOne(
      { id: message.id, ownerEmail },
      { $set: { ...message, conversationId, ownerEmail } },
      { upsert: true },
    );
}

/**
 * Bulk save messages to MongoDB
 */
export async function saveMessagesToDb(
  messages: Message[],
  conversationId: string,
  ownerEmail: string,
): Promise<void> {
  if (messages.length === 0) return;
  const db = await getInboxDb();

  const operations = messages.map((message) => ({
    updateOne: {
      filter: { id: message.id, ownerEmail },
      update: { $set: { ...message, conversationId, ownerEmail } },
      upsert: true,
    },
  }));

  await db.collection(MESSAGES_COLLECTION).bulkWrite(operations);
}

export function encodeMessagesCursor(cursor: MessageCursor): string {
  const raw = JSON.stringify(cursor);
  return Buffer.from(raw, "utf8").toString("base64url");
}

export function decodeMessagesCursor(cursor: string): MessageCursor | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
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
  cursor?: string,
): Promise<{
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const db = await getInboxDb();

  const parsedCursor = cursor ? decodeMessagesCursor(cursor) : null;
  const baseFilter: Record<string, unknown> = {
    conversationId,
    ownerEmail,
    isEmpty: { $ne: true },
    timestamp: { $exists: true, $type: "string" },
  };

  const filter = parsedCursor
    ? { ...baseFilter, ...buildCursorFilter(parsedCursor) }
    : baseFilter;

  const docs = await db
    .collection<MessageDoc>(MESSAGES_COLLECTION)
    .find(filter)
    .sort({ timestamp: -1, id: -1 })
    .limit(limit)
    .toArray();

  const sanitized = docs.map((doc) => {
    const { _id: _ignored, ...rest } = doc as MessageDoc & { _id?: unknown };
    return rest as Message;
  });
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

  const nextCursor = encodeMessagesCursor({
    timestamp: last.timestamp,
    id: last.id,
  });

  const hasMoreFilter = {
    ...baseFilter,
    ...buildCursorFilter({ timestamp: last.timestamp, id: last.id }),
  };
  const nextOne = await db
    .collection(MESSAGES_COLLECTION)
    .findOne(hasMoreFilter);

  return {
    messages: oldestToNewest,
    nextCursor: nextOne ? nextCursor : null,
    hasMore: Boolean(nextOne),
  };
}
