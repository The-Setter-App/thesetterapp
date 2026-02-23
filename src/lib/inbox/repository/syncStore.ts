import { CONVERSATIONS_COLLECTION, getInboxSupabase } from "@/lib/inbox/repository/core";

export async function getConversationGraphSyncState(
  conversationId: string,
  ownerEmail: string,
): Promise<{ graphBeforeCursor?: string; graphBackfillDone?: boolean }> {
  const supabase = getInboxSupabase();

  const { data } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("graph_before_cursor,graph_backfill_done,sync_before_cursor,sync_status")
    .eq("id", conversationId)
    .eq("owner_email", ownerEmail)
    .maybeSingle();

  if (!data) return {};

  const row = data as {
    graph_before_cursor: string | null;
    graph_backfill_done: boolean | null;
    sync_before_cursor: string | null;
    sync_status: string | null;
  };

  return {
    graphBeforeCursor: row.sync_before_cursor ?? row.graph_before_cursor ?? undefined,
    graphBackfillDone: row.sync_status === "done" ? true : row.graph_backfill_done ?? undefined,
  };
}

export async function updateConversationGraphSyncState(
  conversationId: string,
  ownerEmail: string,
  state: { graphBeforeCursor?: string; graphBackfillDone?: boolean },
): Promise<void> {
  const supabase = getInboxSupabase();

  const updates: {
    graph_before_cursor?: string;
    sync_before_cursor?: string;
    graph_backfill_done?: boolean;
    sync_status?: ConversationSyncStatus;
    sync_completed_at?: string;
  } = {};

  if (state.graphBeforeCursor !== undefined) {
    updates.graph_before_cursor = state.graphBeforeCursor;
    updates.sync_before_cursor = state.graphBeforeCursor;
  }

  if (state.graphBackfillDone !== undefined) {
    updates.graph_backfill_done = state.graphBackfillDone;
    updates.sync_status = state.graphBackfillDone ? "done" : "running";
    if (state.graphBackfillDone) {
      updates.sync_completed_at = new Date().toISOString();
    }
  }

  if (Object.keys(updates).length === 0) return;

  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update(updates)
    .eq("id", conversationId)
    .eq("owner_email", ownerEmail);
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
  const supabase = getInboxSupabase();

  const updates: {
    sync_status?: ConversationSyncStatus;
    sync_before_cursor?: string;
    graph_before_cursor?: string;
    sync_completed_at?: string;
    sync_started_at?: string;
    sync_error?: string;
    sync_retry_count?: number;
    sync_message_count?: number;
  } = {};

  if (state.syncStatus !== undefined) updates.sync_status = state.syncStatus;
  if (state.syncBeforeCursor !== undefined) {
    updates.sync_before_cursor = state.syncBeforeCursor;
    updates.graph_before_cursor = state.syncBeforeCursor;
  }
  if (state.syncCompletedAt !== undefined) updates.sync_completed_at = state.syncCompletedAt;
  if (state.syncStartedAt !== undefined) updates.sync_started_at = state.syncStartedAt;
  if (state.syncError !== undefined) updates.sync_error = state.syncError;
  if (state.syncRetryCount !== undefined) updates.sync_retry_count = state.syncRetryCount;
  if (state.syncMessageCount !== undefined) updates.sync_message_count = state.syncMessageCount;

  if (Object.keys(updates).length === 0) return;

  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update(updates)
    .eq("id", conversationId)
    .eq("owner_email", ownerEmail);
}

export async function getConversationSyncState(
  conversationId: string,
  ownerEmail: string,
): Promise<ConversationSyncState | null> {
  const supabase = getInboxSupabase();
  const { data } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("sync_status,sync_before_cursor,sync_completed_at,sync_started_at,sync_error,sync_retry_count,sync_message_count")
    .eq("id", conversationId)
    .eq("owner_email", ownerEmail)
    .maybeSingle();

  if (!data) return null;

  const row = data as {
    sync_status: ConversationSyncStatus | null;
    sync_before_cursor: string | null;
    sync_completed_at: string | null;
    sync_started_at: string | null;
    sync_error: string | null;
    sync_retry_count: number | null;
    sync_message_count: number | null;
  };

  return {
    syncStatus: row.sync_status ?? undefined,
    syncBeforeCursor: row.sync_before_cursor ?? undefined,
    syncCompletedAt: row.sync_completed_at ?? undefined,
    syncStartedAt: row.sync_started_at ?? undefined,
    syncError: row.sync_error ?? undefined,
    syncRetryCount: row.sync_retry_count ?? undefined,
    syncMessageCount: row.sync_message_count ?? undefined,
  };
}

export async function markConversationsPendingSync(ownerEmail: string, conversationIds: string[]): Promise<void> {
  if (!conversationIds.length) return;
  const supabase = getInboxSupabase();

  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update({ sync_status: "pending" as const })
    .eq("owner_email", ownerEmail)
    .in("id", conversationIds);
}

export async function getConversationSyncOverview(ownerEmail: string): Promise<{
  total: number;
  pending: number;
  running: number;
  done: number;
  error: number;
}> {
  const supabase = getInboxSupabase();

  const [total, pending, running, done, error] = await Promise.all([
    supabase.from(CONVERSATIONS_COLLECTION).select("id", { count: "exact", head: true }).eq("owner_email", ownerEmail),
    supabase
      .from(CONVERSATIONS_COLLECTION)
      .select("id", { count: "exact", head: true })
      .eq("owner_email", ownerEmail)
      .eq("sync_status", "pending"),
    supabase
      .from(CONVERSATIONS_COLLECTION)
      .select("id", { count: "exact", head: true })
      .eq("owner_email", ownerEmail)
      .eq("sync_status", "running"),
    supabase
      .from(CONVERSATIONS_COLLECTION)
      .select("id", { count: "exact", head: true })
      .eq("owner_email", ownerEmail)
      .eq("sync_status", "done"),
    supabase
      .from(CONVERSATIONS_COLLECTION)
      .select("id", { count: "exact", head: true })
      .eq("owner_email", ownerEmail)
      .eq("sync_status", "error"),
  ]);

  return {
    total: total.count ?? 0,
    pending: pending.count ?? 0,
    running: running.count ?? 0,
    done: done.count ?? 0,
    error: error.count ?? 0,
  };
}
