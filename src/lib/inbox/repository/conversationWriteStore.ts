import {
  extractUsernameFromUser,
  getBlockedUsernameSet,
} from "@/lib/blockedUsernamesRepository";
import { resolvePendingCommentAutomationSend } from "@/lib/commentAutomationsRepository";
import { revalidateDashboardSnapshotCache } from "@/lib/dashboard/cacheInvalidation";
import { buildConversationSetPayload } from "@/lib/inbox/repository/conversationShared";
import {
  CONVERSATIONS_COLLECTION,
  getInboxSupabase,
} from "@/lib/inbox/repository/core";
import { pickNextRoundRobinAssignee } from "@/lib/roundRobinRepository";
import type { DashboardMessageStats } from "@/types/dashboard";
import type { LeadSource, User } from "@/types/inbox";

async function getExistingConversationPayload(
  conversationId: string,
  ownerEmail: string,
): Promise<User | null> {
  const supabase = getInboxSupabase();
  const { data } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("payload")
    .eq("id", conversationId)
    .eq("owner_email", ownerEmail)
    .maybeSingle();

  if (!data) return null;
  return (data as { payload: User }).payload;
}

export async function saveConversationToDb(
  conversation: User,
  ownerEmail: string,
): Promise<void> {
  const supabase = getInboxSupabase();
  const existing = await getExistingConversationPayload(
    conversation.id,
    ownerEmail,
  );
  const merged = buildConversationSetPayload(
    conversation,
    ownerEmail,
    existing,
  );

  if (!existing) {
    const assignee = await pickNextRoundRobinAssignee(ownerEmail);
    if (assignee) {
      merged.payload.assignedToEmail = assignee.email;
      merged.payload.assignedToLabel = assignee.label;
    }

    if (merged.payload.recipientId) {
      const resolved = await resolvePendingCommentAutomationSend(
        ownerEmail,
        merged.payload.recipientId,
        conversation.id,
      );
      if (resolved) {
        merged.payload.commentAutomationId = resolved.automationId;
        merged.payload.commentAutomationVariantId =
          resolved.variantId ?? undefined;
      }
    }
  }

  const row = {
    owner_email: ownerEmail,
    id: conversation.id,
    payload: merged.payload,
    unread: 0,
    status: merged.payload.status,
    is_priority: merged.payload.isPriority ?? false,
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .upsert(row, { onConflict: "owner_email,id" });
  revalidateDashboardSnapshotCache();
}

export async function saveConversationsToDb(
  conversations: User[],
  ownerEmail: string,
): Promise<void> {
  if (conversations.length === 0) return;

  const blockedUsernames = await getBlockedUsernameSet(ownerEmail);
  const allowedConversations = blockedUsernames.size
    ? conversations.filter(
        (conversation) =>
          !blockedUsernames.has(extractUsernameFromUser(conversation)),
      )
    : conversations;

  if (allowedConversations.length === 0) return;

  const rows: Array<{
    owner_email: string;
    id: string;
    payload: User;
    unread: number;
    status: string | undefined;
    is_priority: boolean;
    updated_at: string;
  }> = [];

  for (const conversation of allowedConversations) {
    const existing = await getExistingConversationPayload(
      conversation.id,
      ownerEmail,
    );
    const merged = buildConversationSetPayload(
      conversation,
      ownerEmail,
      existing,
    );

    if (!existing) {
      const assignee = await pickNextRoundRobinAssignee(ownerEmail);
      if (assignee) {
        merged.payload.assignedToEmail = assignee.email;
        merged.payload.assignedToLabel = assignee.label;
      }

      if (merged.payload.recipientId) {
        const resolved = await resolvePendingCommentAutomationSend(
          ownerEmail,
          merged.payload.recipientId,
          conversation.id,
        );
        if (resolved) {
          merged.payload.commentAutomationId = resolved.automationId;
          merged.payload.commentAutomationVariantId =
            resolved.variantId ?? undefined;
        }
      }
    }

    rows.push({
      owner_email: ownerEmail,
      id: conversation.id,
      payload: merged.payload,
      unread: existing?.unread ?? 0,
      status: merged.payload.status,
      is_priority: merged.payload.isPriority ?? false,
      updated_at: new Date().toISOString(),
    });
  }

  const supabase = getInboxSupabase();
  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .upsert(rows, { onConflict: "owner_email,id" });
  revalidateDashboardSnapshotCache();
}

export async function updateConversationMetadata(
  conversationId: string,
  ownerEmail: string,
  lastMessage: string,
  time: string,
  incrementUnread: boolean,
  clearUnread = false,
  eventTimestampIso?: string,
  leadSource?: LeadSource | null,
): Promise<void> {
  const supabase = getInboxSupabase();
  const existing = await getExistingConversationPayload(
    conversationId,
    ownerEmail,
  );
  if (!existing) return;

  const { data: unreadRow } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("unread")
    .eq("owner_email", ownerEmail)
    .eq("id", conversationId)
    .maybeSingle();

  const currentUnread = (unreadRow as { unread: number } | null)?.unread ?? 0;
  const nextUnread = clearUnread
    ? 0
    : incrementUnread
      ? currentUnread + 1
      : currentUnread;
  const nextNeedsReply = clearUnread
    ? false
    : incrementUnread
      ? true
      : Boolean(existing.needsReply);

  const nextPayload: User = {
    ...existing,
    lastMessage,
    time,
    updatedAt: eventTimestampIso || new Date().toISOString(),
    unread: nextUnread,
    needsReply: nextNeedsReply,
    lastInboundAt: incrementUnread
      ? eventTimestampIso || new Date().toISOString()
      : existing.lastInboundAt,
    // First-touch attribution only - don't overwrite once a source is known.
    leadSource: existing.leadSource ?? leadSource ?? undefined,
  };

  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update({
      payload: nextPayload,
      unread: nextUnread,
      updated_at: eventTimestampIso || new Date().toISOString(),
    })
    .eq("owner_email", ownerEmail)
    .eq("id", conversationId);
  revalidateDashboardSnapshotCache();
}

/**
 * Records that AI classification ran, and applies the matched status if it
 * differs from the current one. Always stamps statusClassifiedAt (even on
 * no match) so the classification cooldown holds regardless of outcome.
 * Deliberately separate from updateUserStatus, which is the manual-change
 * path (from the status dropdown) and shouldn't be tagged as AI-driven.
 */
export async function applyStatusClassificationResult(
  conversationId: string,
  ownerEmail: string,
  matchedStatus: string | null,
  classifiedAt: string,
): Promise<void> {
  const supabase = getInboxSupabase();
  const existing = await getExistingConversationPayload(
    conversationId,
    ownerEmail,
  );
  if (!existing) return;

  const nextStatus =
    matchedStatus && matchedStatus !== existing.status
      ? (matchedStatus as User["status"])
      : existing.status;

  const nextPayload: User = {
    ...existing,
    status: nextStatus,
    statusClassifiedAt: classifiedAt,
  };

  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update({
      payload: nextPayload,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_email", ownerEmail)
    .eq("id", conversationId);

  if (nextStatus !== existing.status) {
    revalidateDashboardSnapshotCache();
  }
}

/**
 * Auto-assigns a conversation to whoever sends its first reply.
 * First-touch only - never reassigns once someone is already set.
 */
export async function assignConversationOnFirstReply(
  conversationId: string,
  ownerEmail: string,
  assigneeEmail: string,
  assigneeLabel: string,
): Promise<void> {
  const supabase = getInboxSupabase();
  const existing = await getExistingConversationPayload(
    conversationId,
    ownerEmail,
  );
  if (!existing || existing.assignedToEmail) return;

  const nextPayload: User = {
    ...existing,
    assignedToEmail: assigneeEmail,
    assignedToLabel: assigneeLabel,
  };

  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update({ payload: nextPayload })
    .eq("owner_email", ownerEmail)
    .eq("id", conversationId);
}

export async function updateUserStatus(
  conversationId: string,
  ownerEmail: string,
  newStatus: string,
): Promise<void> {
  const supabase = getInboxSupabase();
  const existing = await getExistingConversationPayload(
    conversationId,
    ownerEmail,
  );
  if (!existing) return;

  const nextPayload: User = {
    ...existing,
    status: newStatus as User["status"],
  };
  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update({
      payload: nextPayload,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_email", ownerEmail)
    .eq("id", conversationId);
  revalidateDashboardSnapshotCache();
}

export async function updateConversationPriority(
  conversationId: string,
  ownerEmail: string,
  isPriority: boolean,
): Promise<void> {
  const supabase = getInboxSupabase();
  const existing = await getExistingConversationPayload(
    conversationId,
    ownerEmail,
  );
  if (!existing) return;

  const nextPayload: User = { ...existing, isPriority };
  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update({
      payload: nextPayload,
      is_priority: isPriority,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_email", ownerEmail)
    .eq("id", conversationId);
  revalidateDashboardSnapshotCache();
}

export async function updateUserAvatar(
  conversationId: string,
  ownerEmail: string,
  avatarUrl: string,
): Promise<void> {
  const supabase = getInboxSupabase();
  const existing = await getExistingConversationPayload(
    conversationId,
    ownerEmail,
  );
  if (!existing) return;

  const nextPayload: User = { ...existing, avatar: avatarUrl };
  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update({ payload: nextPayload, updated_at: new Date().toISOString() })
    .eq("owner_email", ownerEmail)
    .eq("id", conversationId);
}

export async function updateConversationDashboardStats(
  conversationId: string,
  ownerEmail: string,
  dashboardMessageStats: DashboardMessageStats,
): Promise<void> {
  const supabase = getInboxSupabase();
  const existing = await getExistingConversationPayload(
    conversationId,
    ownerEmail,
  );
  if (!existing) return;

  const nextPayload: User = {
    ...existing,
    dashboardMessageStats,
  };

  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update({ payload: nextPayload })
    .eq("owner_email", ownerEmail)
    .eq("id", conversationId);
  revalidateDashboardSnapshotCache();
}
