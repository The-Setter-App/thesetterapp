import type { ConversationDoc } from "@/lib/inbox/repository/conversationShared";
import {
  CONVERSATIONS_COLLECTION,
  getInboxDb,
} from "@/lib/inbox/repository/core";
import type { User } from "@/types/inbox";

/**
 * Get all conversations from MongoDB for a specific owner
 */
export async function getConversationsFromDb(
  ownerEmail: string,
): Promise<User[]> {
  try {
    const db = await getInboxDb();
    // Filter by ownerEmail
    const docs = await db
      .collection<ConversationDoc>(CONVERSATIONS_COLLECTION)
      .find({ ownerEmail })
      .sort({ updatedAt: -1, id: -1 })
      .toArray();
    // Sanitize _id for Client Components
    return docs.map((doc) => {
      const { _id: _ignored, ...rest } = doc as ConversationDoc & {
        _id?: unknown;
      };
      return rest as User;
    });
  } catch (error) {
    console.error("[InboxRepo] Error fetching conversations:", error);
    return [];
  }
}

/**
 * Find a conversation by the other participant's user ID (recipientId).
 * Returns the full User object, or null if not found.
 */
export async function findConversationByRecipientId(
  recipientId: string,
  ownerEmail: string,
): Promise<User | null> {
  const db = await getInboxDb();
  const user = await db
    .collection<ConversationDoc>(CONVERSATIONS_COLLECTION)
    .findOne({ recipientId, ownerEmail });

  if (!user) return null;

  // Sanitize _id
  const { _id: _ignored, ...rest } = user as ConversationDoc & {
    _id?: unknown;
  };
  return rest as User;
}

export async function findConversationById(
  conversationId: string,
  ownerEmail: string,
): Promise<User | null> {
  const db = await getInboxDb();
  const user = await db
    .collection<ConversationDoc>(CONVERSATIONS_COLLECTION)
    .findOne({ id: conversationId, ownerEmail });

  if (!user) return null;
  const { _id: _ignored, ...rest } = user as ConversationDoc & {
    _id?: unknown;
  };
  return rest as User;
}

/**
 * Find a conversation ID by the other participant's ID
 */
export async function findConversationIdByParticipant(
  participantId: string,
  ownerEmail: string,
): Promise<string | undefined> {
  const db = await getInboxDb();
  const conversation = await db
    .collection<ConversationDoc>(CONVERSATIONS_COLLECTION)
    .findOne({
      recipientId: participantId,
      ownerEmail,
    });
  if (!conversation) return undefined;
  return conversation.id;
}

export async function findConversationIdByParticipantAndAccount(
  participantId: string,
  ownerEmail: string,
  ownerInstagramUserId: string,
): Promise<string | undefined> {
  const db = await getInboxDb();
  const conversation = await db
    .collection<ConversationDoc>(CONVERSATIONS_COLLECTION)
    .findOne({
      recipientId: participantId,
      ownerEmail,
      ownerInstagramUserId,
    });
  return conversation?.id;
}

export async function findConversationIdByParticipantUnique(
  participantId: string,
  ownerEmail: string,
): Promise<string | undefined> {
  const db = await getInboxDb();
  const docs = await db
    .collection<ConversationDoc>(CONVERSATIONS_COLLECTION)
    .find({ recipientId: participantId, ownerEmail })
    .project({ id: 1 })
    .limit(2)
    .toArray();

  // Only return a fallback match when unambiguous.
  if (docs.length !== 1) return undefined;
  return docs[0]?.id;
}
