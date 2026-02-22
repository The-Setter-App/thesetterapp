import { getInboxDb, SYNC_COLLECTION } from "@/lib/inbox/repository/core";

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

export async function getInboxSyncJob(
  ownerEmail: string,
): Promise<InboxSyncJobState | null> {
  const db = await getInboxDb();
  const doc = await db
    .collection<InboxSyncJobState>(SYNC_COLLECTION)
    .findOne({ ownerEmail });
  if (!doc) return null;
  const { _id: _ignored, ...rest } = doc as InboxSyncJobState & {
    _id?: unknown;
  };
  return rest as InboxSyncJobState;
}

export async function upsertInboxSyncJob(
  ownerEmail: string,
  updates: Partial<InboxSyncJobState>,
): Promise<void> {
  const db = await getInboxDb();
  await db
    .collection(SYNC_COLLECTION)
    .updateOne(
      { ownerEmail },
      { $set: { ...updates, ownerEmail } },
      { upsert: true },
    );
}
