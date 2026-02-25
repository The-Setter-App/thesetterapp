import { CONVERSATIONS_COLLECTION, getInboxSupabase } from "@/lib/inbox/repository/core";
import type { User } from "@/types/inbox";

type ConversationRow = {
  owner_email: string;
  id: string;
  payload: User;
  updated_at: string;
};

function mapConversation(row: ConversationRow): User {
  return {
    ...row.payload,
    id: row.id,
    updatedAt: row.payload.updatedAt || row.updated_at,
  };
}

export async function getConversationsFromDb(ownerEmail: string): Promise<User[]> {
  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("owner_email,id,payload,updated_at")
    .eq("owner_email", ownerEmail)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false });

  if (error || !data) {
    console.error("[InboxRepo] Error fetching conversations:", error);
    return [];
  }

  return (data as ConversationRow[]).map(mapConversation);
}

export async function findConversationByRecipientId(recipientId: string, ownerEmail: string): Promise<User | null> {
  const supabase = getInboxSupabase();
  const { data } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("owner_email,id,payload,updated_at")
    .eq("owner_email", ownerEmail)
    .filter("payload->>recipientId", "eq", recipientId)
    .maybeSingle();

  if (!data) return null;
  return mapConversation(data as ConversationRow);
}

export async function findConversationById(conversationId: string, ownerEmail: string): Promise<User | null> {
  const supabase = getInboxSupabase();
  const { data } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("owner_email,id,payload,updated_at")
    .eq("owner_email", ownerEmail)
    .eq("id", conversationId)
    .maybeSingle();

  if (!data) return null;
  return mapConversation(data as ConversationRow);
}

export async function findConversationIdByParticipant(participantId: string, ownerEmail: string): Promise<string | undefined> {
  const conversation = await findConversationByRecipientId(participantId, ownerEmail);
  return conversation?.id;
}

export async function findConversationIdByParticipantAndAccount(
  participantId: string,
  ownerEmail: string,
  ownerInstagramUserId: string,
): Promise<string | undefined> {
  const supabase = getInboxSupabase();
  const { data } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("id")
    .eq("owner_email", ownerEmail)
    .filter("payload->>recipientId", "eq", participantId)
    .filter("payload->>ownerInstagramUserId", "eq", ownerInstagramUserId)
    .maybeSingle();

  return (data as { id: string } | null)?.id;
}

export async function findConversationIdByParticipantUnique(
  participantId: string,
  ownerEmail: string,
): Promise<string | undefined> {
  const supabase = getInboxSupabase();
  const { data } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("id")
    .eq("owner_email", ownerEmail)
    .filter("payload->>recipientId", "eq", participantId)
    .limit(2);

  if (!data || data.length !== 1) return undefined;
  return (data[0] as { id: string }).id;
}
