import { buildConversationTrackingHash } from "@/lib/calendly/tracking";
import { getInboxSupabase } from "@/lib/inbox/repository/core";
import { CONVERSATIONS_TABLE, MESSAGES_TABLE } from "./repository.shared";

export async function findConversationIdByContactEmail(input: {
  ownerEmail: string;
  email: string;
}): Promise<string | null> {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .select("id,contact_details,payload")
    .eq("owner_email", input.ownerEmail)
    .limit(400);

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to search conversation by email: ${error.message}`,
    );
  }

  const rows = (data || []) as Array<{
    id: string;
    contact_details?: { email?: string } | null;
    payload?: { contactDetails?: { email?: string } } | null;
  }>;

  const matched = rows.find((row) => {
    const contactEmail =
      row.contact_details?.email || row.payload?.contactDetails?.email || "";
    return contactEmail.trim().toLowerCase() === normalizedEmail;
  });

  return matched?.id ?? null;
}

export async function findConversationIdByTrackingHash(input: {
  ownerEmail: string;
  conversationHash: string;
}): Promise<string | null> {
  const hash = input.conversationHash.trim();
  if (!hash) return null;

  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .select("id")
    .eq("owner_email", input.ownerEmail)
    .limit(1000);

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to search conversation by tracking hash: ${error.message}`,
    );
  }

  const rows = (data || []) as Array<{ id: string }>;
  const matched = rows.find((row) => {
    return (
      buildConversationTrackingHash({
        workspaceOwnerEmail: input.ownerEmail,
        conversationId: row.id,
      }) === hash
    );
  });

  return matched?.id ?? null;
}

export async function findConversationIdByTrackingTokenPrefix(input: {
  ownerEmail: string;
  tokenPrefix: string;
}): Promise<string | null> {
  const prefix = input.tokenPrefix.trim();
  if (!prefix) return null;

  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .select("conversation_id,payload,timestamp_text")
    .eq("owner_email", input.ownerEmail)
    .eq("from_me", true)
    .eq("type", "text")
    .order("timestamp_text", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to search messages by token prefix: ${error.message}`,
    );
  }

  const rows = (data || []) as Array<{
    conversation_id: string;
    payload?: { text?: string } | null;
  }>;

  const matched = rows.find((row) => {
    const text = row.payload?.text || "";
    return typeof text === "string" && text.includes(prefix);
  });

  return matched?.conversation_id ?? null;
}
