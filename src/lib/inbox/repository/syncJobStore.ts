import { getInboxSupabase, SYNC_COLLECTION } from "@/lib/inbox/repository/core";

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

export async function getInboxSyncJob(ownerEmail: string): Promise<InboxSyncJobState | null> {
  const supabase = getInboxSupabase();
  const { data } = await supabase
    .from(SYNC_COLLECTION)
    .select(
      "owner_email,in_progress,total_conversations,completed_conversations,failed_conversations,last_started_at,last_completed_at,last_error,heartbeat_at",
    )
    .eq("owner_email", ownerEmail)
    .maybeSingle();

  if (!data) return null;

  const row = data as {
    owner_email: string;
    in_progress: boolean;
    total_conversations: number;
    completed_conversations: number;
    failed_conversations: number;
    last_started_at: string | null;
    last_completed_at: string | null;
    last_error: string | null;
    heartbeat_at: string | null;
  };

  return {
    ownerEmail: row.owner_email,
    inProgress: row.in_progress,
    totalConversations: row.total_conversations,
    completedConversations: row.completed_conversations,
    failedConversations: row.failed_conversations,
    lastStartedAt: row.last_started_at ?? undefined,
    lastCompletedAt: row.last_completed_at ?? undefined,
    lastError: row.last_error ?? undefined,
    heartbeatAt: row.heartbeat_at ?? undefined,
  };
}

export async function upsertInboxSyncJob(ownerEmail: string, updates: Partial<InboxSyncJobState>): Promise<void> {
  const supabase = getInboxSupabase();
  await supabase.from(SYNC_COLLECTION).upsert(
    {
      owner_email: ownerEmail,
      in_progress: updates.inProgress ?? false,
      total_conversations: updates.totalConversations ?? 0,
      completed_conversations: updates.completedConversations ?? 0,
      failed_conversations: updates.failedConversations ?? 0,
      last_started_at: updates.lastStartedAt ?? null,
      last_completed_at: updates.lastCompletedAt ?? null,
      last_error: updates.lastError ?? null,
      heartbeat_at: updates.heartbeatAt ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_email" },
  );
}
