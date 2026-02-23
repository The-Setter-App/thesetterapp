import { buildConversationSetPayload } from "@/lib/inbox/repository/conversationShared";
import { CONVERSATIONS_COLLECTION, getInboxSupabase } from "@/lib/inbox/repository/core";
import type { User } from "@/types/inbox";

async function getExistingConversationPayload(conversationId: string, ownerEmail: string): Promise<User | null> {
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

export async function saveConversationToDb(conversation: User, ownerEmail: string): Promise<void> {
  const supabase = getInboxSupabase();
  const existing = await getExistingConversationPayload(conversation.id, ownerEmail);
  const merged = buildConversationSetPayload(conversation, ownerEmail, existing);

  const row = {
    owner_email: ownerEmail,
    id: conversation.id,
    payload: merged.payload,
    unread: 0,
    status: merged.payload.status,
    is_priority: merged.payload.isPriority ?? false,
    updated_at: new Date().toISOString(),
  };

  await supabase.from(CONVERSATIONS_COLLECTION).upsert(row, { onConflict: "owner_email,id" });
}

export async function saveConversationsToDb(conversations: User[], ownerEmail: string): Promise<void> {
  if (conversations.length === 0) return;

  const rows: Array<{
    owner_email: string;
    id: string;
    payload: User;
    unread: number;
    status: string | undefined;
    is_priority: boolean;
    updated_at: string;
  }> = [];

  for (const conversation of conversations) {
    const existing = await getExistingConversationPayload(conversation.id, ownerEmail);
    const merged = buildConversationSetPayload(conversation, ownerEmail, existing);
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
  await supabase.from(CONVERSATIONS_COLLECTION).upsert(rows, { onConflict: "owner_email,id" });
}

export async function updateConversationMetadata(
  conversationId: string,
  ownerEmail: string,
  lastMessage: string,
  time: string,
  incrementUnread: boolean,
  clearUnread = false,
  eventTimestampIso?: string,
): Promise<void> {
  const supabase = getInboxSupabase();
  const existing = await getExistingConversationPayload(conversationId, ownerEmail);
  if (!existing) return;

  const { data: unreadRow } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("unread")
    .eq("owner_email", ownerEmail)
    .eq("id", conversationId)
    .maybeSingle();

  const currentUnread = (unreadRow as { unread: number } | null)?.unread ?? 0;
  const nextUnread = clearUnread ? 0 : incrementUnread ? currentUnread + 1 : currentUnread;

  const nextPayload: User = {
    ...existing,
    lastMessage,
    time,
    updatedAt: eventTimestampIso || new Date().toISOString(),
    unread: nextUnread,
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
}

export async function updateUserStatus(conversationId: string, ownerEmail: string, newStatus: string): Promise<void> {
  const supabase = getInboxSupabase();
  const existing = await getExistingConversationPayload(conversationId, ownerEmail);
  if (!existing) return;

  const nextPayload: User = { ...existing, status: newStatus as User["status"] };
  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update({ payload: nextPayload, status: newStatus, updated_at: new Date().toISOString() })
    .eq("owner_email", ownerEmail)
    .eq("id", conversationId);
}

export async function updateConversationPriority(
  conversationId: string,
  ownerEmail: string,
  isPriority: boolean,
): Promise<void> {
  const supabase = getInboxSupabase();
  const existing = await getExistingConversationPayload(conversationId, ownerEmail);
  if (!existing) return;

  const nextPayload: User = { ...existing, isPriority };
  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update({ payload: nextPayload, is_priority: isPriority, updated_at: new Date().toISOString() })
    .eq("owner_email", ownerEmail)
    .eq("id", conversationId);
}

export async function updateUserAvatar(conversationId: string, ownerEmail: string, avatarUrl: string): Promise<void> {
  const supabase = getInboxSupabase();
  const existing = await getExistingConversationPayload(conversationId, ownerEmail);
  if (!existing) return;

  const nextPayload: User = { ...existing, avatar: avatarUrl };
  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update({ payload: nextPayload, updated_at: new Date().toISOString() })
    .eq("owner_email", ownerEmail)
    .eq("id", conversationId);
}
