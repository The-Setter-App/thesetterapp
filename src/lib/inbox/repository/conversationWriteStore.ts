import {
  buildConversationSetPayload,
  type ConversationDoc,
} from "@/lib/inbox/repository/conversationShared";
import {
  CONVERSATIONS_COLLECTION,
  getInboxDb,
} from "@/lib/inbox/repository/core";
import type { User } from "@/types/inbox";

/**
 * Save or update a single conversation in MongoDB
 */
export async function saveConversationToDb(
  conversation: User,
  ownerEmail: string,
): Promise<void> {
  const db = await getInboxDb();
  const existing = await db
    .collection<ConversationDoc>(CONVERSATIONS_COLLECTION)
    .findOne({ id: conversation.id, ownerEmail });

  const setPayload = buildConversationSetPayload(
    conversation,
    ownerEmail,
    existing,
  );

  await db.collection(CONVERSATIONS_COLLECTION).updateOne(
    { id: conversation.id, ownerEmail },
    {
      $set: setPayload,
      $setOnInsert: { unread: 0 },
    },
    { upsert: true },
  );
}

/**
 * Bulk save conversations to MongoDB
 */
export async function saveConversationsToDb(
  conversations: User[],
  ownerEmail: string,
): Promise<void> {
  if (conversations.length === 0) return;
  const db = await getInboxDb();

  const operations = await Promise.all(
    conversations.map(async (conversation) => {
      // Preserve custom status if already set in DB
      const existing = await db
        .collection<ConversationDoc>(CONVERSATIONS_COLLECTION)
        .findOne({ id: conversation.id, ownerEmail });
      const setPayload = buildConversationSetPayload(
        conversation,
        ownerEmail,
        existing,
      );

      return {
        updateOne: {
          filter: { id: conversation.id, ownerEmail },
          update: {
            $set: setPayload,
            $setOnInsert: { unread: 0 },
          },
          upsert: true,
        },
      };
    }),
  );

  await db.collection(CONVERSATIONS_COLLECTION).bulkWrite(operations);
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
  eventTimestampIso?: string,
): Promise<void> {
  const db = await getInboxDb();

  const update: {
    $set: {
      lastMessage: string;
      time: string;
      updatedAt: string;
      unread?: number;
    };
    $inc?: { unread: number };
  } = {
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

  await db
    .collection(CONVERSATIONS_COLLECTION)
    .updateOne({ id: conversationId, ownerEmail }, update);
}

/**
 * Update user status by recipientId
 */
export async function updateUserStatus(
  conversationId: string,
  ownerEmail: string,
  newStatus: string,
): Promise<void> {
  const db = await getInboxDb();

  await db
    .collection(CONVERSATIONS_COLLECTION)
    .updateOne(
      { id: conversationId, ownerEmail },
      { $set: { status: newStatus } },
    );
}

export async function updateConversationPriority(
  conversationId: string,
  ownerEmail: string,
  isPriority: boolean,
): Promise<void> {
  const db = await getInboxDb();

  await db
    .collection(CONVERSATIONS_COLLECTION)
    .updateOne({ id: conversationId, ownerEmail }, { $set: { isPriority } });
}

/**
 * Update user avatar
 */
export async function updateUserAvatar(
  conversationId: string,
  ownerEmail: string,
  avatarUrl: string,
): Promise<void> {
  const db = await getInboxDb();

  await db
    .collection(CONVERSATIONS_COLLECTION)
    .updateOne(
      { id: conversationId, ownerEmail },
      { $set: { avatar: avatarUrl } },
    );
}
