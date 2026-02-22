import type { Db } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const DB_NAME = "thesetterapp";
export const CONVERSATIONS_COLLECTION = "conversations";
export const MESSAGES_COLLECTION = "messages";
export const SYNC_COLLECTION = "inbox_sync_jobs";
export const AUDIO_BUCKET = "voice_notes";
export const EMPTY_PREVIEW = "No messages yet";

let indexesReady = false;

export async function ensureInboxIndexes(db: Db): Promise<void> {
  if (indexesReady) return;

  const results = await Promise.allSettled([
    db
      .collection(MESSAGES_COLLECTION)
      .createIndex({ ownerEmail: 1, id: 1 }, { unique: true }),
    db
      .collection(MESSAGES_COLLECTION)
      .createIndex({ ownerEmail: 1, conversationId: 1, timestamp: -1, id: -1 }),
    db
      .collection(CONVERSATIONS_COLLECTION)
      .createIndex({ ownerEmail: 1, recipientId: 1 }),
    db
      .collection(CONVERSATIONS_COLLECTION)
      .createIndex({ ownerEmail: 1, id: 1 }),
    db
      .collection(SYNC_COLLECTION)
      .createIndex({ ownerEmail: 1 }, { unique: true }),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      const mongoCode = (result.reason as { code?: number } | undefined)?.code;
      // Safe to ignore existing-index naming conflicts from older deployments.
      if (mongoCode === 85) continue;
      console.warn(
        "[InboxRepo] Failed to create one or more indexes:",
        result.reason,
      );
    }
  }

  indexesReady = true;
}

export async function getInboxDb(): Promise<Db> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureInboxIndexes(db);
  return db;
}
