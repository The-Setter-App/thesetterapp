import { ObjectId } from "mongodb";
import {
  AUDIO_BUCKET,
  CONVERSATIONS_COLLECTION,
  getInboxDb,
  MESSAGES_COLLECTION,
} from "@/lib/inbox/repository/core";

export async function purgeInboxDataForInstagramAccount(
  ownerEmail: string,
  options: { accountId?: string; ownerInstagramUserId?: string },
): Promise<{
  conversationsDeleted: number;
  messagesDeleted: number;
  audioFilesDeleted: number;
}> {
  const db = await getInboxDb();

  const orFilters: Record<string, unknown>[] = [];
  if (typeof options.accountId === "string" && options.accountId.trim()) {
    orFilters.push({ accountId: options.accountId });
  }
  if (
    typeof options.ownerInstagramUserId === "string" &&
    options.ownerInstagramUserId.trim()
  ) {
    orFilters.push({ ownerInstagramUserId: options.ownerInstagramUserId });
  }
  if (orFilters.length === 0) {
    return {
      conversationsDeleted: 0,
      messagesDeleted: 0,
      audioFilesDeleted: 0,
    };
  }

  const conversationFilter = {
    ownerEmail,
    $or: orFilters,
  };

  const conversations = await db
    .collection(CONVERSATIONS_COLLECTION)
    .find(conversationFilter, { projection: { id: 1 } })
    .toArray();
  const conversationIds = conversations
    .map((doc) => (doc as { id?: string }).id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (conversationIds.length === 0) {
    return {
      conversationsDeleted: 0,
      messagesDeleted: 0,
      audioFilesDeleted: 0,
    };
  }

  const audioDocs = await db
    .collection(MESSAGES_COLLECTION)
    .find(
      {
        ownerEmail,
        conversationId: { $in: conversationIds },
        "audioStorage.fileId": { $exists: true, $type: "string" },
      },
      { projection: { audioStorage: 1 } },
    )
    .toArray();

  const audioFileObjectIds: ObjectId[] = [];
  for (const doc of audioDocs) {
    const fileId = (doc as { audioStorage?: { fileId?: string } }).audioStorage
      ?.fileId;
    if (!fileId) continue;
    try {
      audioFileObjectIds.push(new ObjectId(fileId));
    } catch {
      // Ignore malformed IDs from legacy records.
    }
  }

  const [messagesResult, conversationsResult] = await Promise.all([
    db.collection(MESSAGES_COLLECTION).deleteMany({
      ownerEmail,
      conversationId: { $in: conversationIds },
    }),
    db.collection(CONVERSATIONS_COLLECTION).deleteMany({
      ownerEmail,
      id: { $in: conversationIds },
    }),
  ]);

  let audioFilesDeleted = 0;
  if (audioFileObjectIds.length > 0) {
    const [filesResult, chunksResult] = await Promise.all([
      db.collection(`${AUDIO_BUCKET}.files`).deleteMany({
        _id: { $in: audioFileObjectIds },
        "metadata.ownerEmail": ownerEmail,
      }),
      db.collection(`${AUDIO_BUCKET}.chunks`).deleteMany({
        files_id: { $in: audioFileObjectIds },
      }),
    ]);
    audioFilesDeleted =
      (filesResult.deletedCount || 0) + (chunksResult.deletedCount || 0);
  }

  return {
    conversationsDeleted: conversationsResult.deletedCount || 0,
    messagesDeleted: messagesResult.deletedCount || 0,
    audioFilesDeleted,
  };
}
