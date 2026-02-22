import {
  CONVERSATIONS_COLLECTION,
  getInboxDb,
} from "@/lib/inbox/repository/core";

export async function getConversationGraphSyncState(
  conversationId: string,
  ownerEmail: string,
): Promise<{ graphBeforeCursor?: string; graphBackfillDone?: boolean }> {
  const db = await getInboxDb();

  const doc = await db.collection(CONVERSATIONS_COLLECTION).findOne(
    { id: conversationId, ownerEmail },
    {
      projection: {
        graphBeforeCursor: 1,
        graphBackfillDone: 1,
        syncBeforeCursor: 1,
        syncStatus: 1,
      },
    },
  );

  if (!doc) return {};

  return {
    graphBeforeCursor:
      typeof (doc as { syncBeforeCursor?: unknown }).syncBeforeCursor ===
      "string"
        ? (doc as { syncBeforeCursor?: string }).syncBeforeCursor
        : typeof (doc as { graphBeforeCursor?: unknown }).graphBeforeCursor ===
            "string"
          ? (doc as { graphBeforeCursor?: string }).graphBeforeCursor
          : undefined,
    graphBackfillDone:
      (doc as { syncStatus?: string }).syncStatus === "done"
        ? true
        : typeof (doc as { graphBackfillDone?: unknown }).graphBackfillDone ===
            "boolean"
          ? (doc as { graphBackfillDone?: boolean }).graphBackfillDone
          : undefined,
  };
}

export async function updateConversationGraphSyncState(
  conversationId: string,
  ownerEmail: string,
  state: { graphBeforeCursor?: string; graphBackfillDone?: boolean },
): Promise<void> {
  const db = await getInboxDb();

  const setPayload: Record<string, unknown> = {};
  if (state.graphBeforeCursor !== undefined) {
    setPayload.graphBeforeCursor = state.graphBeforeCursor;
    setPayload.syncBeforeCursor = state.graphBeforeCursor;
  }
  if (state.graphBackfillDone !== undefined) {
    setPayload.graphBackfillDone = state.graphBackfillDone;
    setPayload.syncStatus = state.graphBackfillDone ? "done" : "running";
    if (state.graphBackfillDone) {
      setPayload.syncCompletedAt = new Date().toISOString();
    }
  }
  if (Object.keys(setPayload).length === 0) return;

  await db
    .collection(CONVERSATIONS_COLLECTION)
    .updateOne({ id: conversationId, ownerEmail }, { $set: setPayload });
}

export type ConversationSyncStatus = "pending" | "running" | "done" | "error";

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
  state: ConversationSyncState,
): Promise<void> {
  const db = await getInboxDb();

  const setPayload: Record<string, unknown> = {};
  if (state.syncStatus !== undefined) setPayload.syncStatus = state.syncStatus;
  if (state.syncBeforeCursor !== undefined) {
    setPayload.syncBeforeCursor = state.syncBeforeCursor;
    setPayload.graphBeforeCursor = state.syncBeforeCursor;
  }
  if (state.syncCompletedAt !== undefined)
    setPayload.syncCompletedAt = state.syncCompletedAt;
  if (state.syncStartedAt !== undefined)
    setPayload.syncStartedAt = state.syncStartedAt;
  if (state.syncError !== undefined) setPayload.syncError = state.syncError;
  if (state.syncRetryCount !== undefined)
    setPayload.syncRetryCount = state.syncRetryCount;
  if (state.syncMessageCount !== undefined)
    setPayload.syncMessageCount = state.syncMessageCount;
  if (Object.keys(setPayload).length === 0) return;

  await db
    .collection(CONVERSATIONS_COLLECTION)
    .updateOne(
      { id: conversationId, ownerEmail },
      { $set: setPayload },
      { upsert: false },
    );
}

export async function getConversationSyncState(
  conversationId: string,
  ownerEmail: string,
): Promise<ConversationSyncState | null> {
  const db = await getInboxDb();
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
    },
  );

  if (!doc) return null;

  return {
    syncStatus:
      typeof (doc as { syncStatus?: unknown }).syncStatus === "string"
        ? (doc as { syncStatus?: ConversationSyncStatus }).syncStatus
        : undefined,
    syncBeforeCursor:
      typeof (doc as { syncBeforeCursor?: unknown }).syncBeforeCursor ===
      "string"
        ? (doc as { syncBeforeCursor?: string }).syncBeforeCursor
        : undefined,
    syncCompletedAt:
      typeof (doc as { syncCompletedAt?: unknown }).syncCompletedAt === "string"
        ? (doc as { syncCompletedAt?: string }).syncCompletedAt
        : undefined,
    syncStartedAt:
      typeof (doc as { syncStartedAt?: unknown }).syncStartedAt === "string"
        ? (doc as { syncStartedAt?: string }).syncStartedAt
        : undefined,
    syncError:
      typeof (doc as { syncError?: unknown }).syncError === "string"
        ? (doc as { syncError?: string }).syncError
        : undefined,
    syncRetryCount:
      typeof (doc as { syncRetryCount?: unknown }).syncRetryCount === "number"
        ? (doc as { syncRetryCount?: number }).syncRetryCount
        : undefined,
    syncMessageCount:
      typeof (doc as { syncMessageCount?: unknown }).syncMessageCount ===
      "number"
        ? (doc as { syncMessageCount?: number }).syncMessageCount
        : undefined,
  };
}

export async function markConversationsPendingSync(
  ownerEmail: string,
  conversationIds: string[],
): Promise<void> {
  if (!conversationIds.length) return;
  const db = await getInboxDb();
  await db.collection(CONVERSATIONS_COLLECTION).updateMany(
    { ownerEmail, id: { $in: conversationIds } },
    {
      $set: { syncStatus: "pending" },
      $setOnInsert: { syncRetryCount: 0, syncMessageCount: 0 },
    },
  );
}

export async function getConversationSyncOverview(ownerEmail: string): Promise<{
  total: number;
  pending: number;
  running: number;
  done: number;
  error: number;
}> {
  const db = await getInboxDb();

  const [total, pending, running, done, error] = await Promise.all([
    db.collection(CONVERSATIONS_COLLECTION).countDocuments({ ownerEmail }),
    db
      .collection(CONVERSATIONS_COLLECTION)
      .countDocuments({ ownerEmail, syncStatus: "pending" }),
    db
      .collection(CONVERSATIONS_COLLECTION)
      .countDocuments({ ownerEmail, syncStatus: "running" }),
    db
      .collection(CONVERSATIONS_COLLECTION)
      .countDocuments({ ownerEmail, syncStatus: "done" }),
    db
      .collection(CONVERSATIONS_COLLECTION)
      .countDocuments({ ownerEmail, syncStatus: "error" }),
  ]);

  return { total, pending, running, done, error };
}
