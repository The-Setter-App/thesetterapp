import { randomBytes } from "node:crypto";
import { getInboxSupabase } from "@/lib/inbox/repository/core";
import type { InboxCalendlyInviteRow } from "@/lib/supabase/types";
import { INVITES_TABLE } from "./repository.shared";

export function generateInviteId(): string {
  return randomBytes(8).toString("hex");
}

export async function createCalendlyInvite(input: {
  ownerEmail: string;
  inviteId: string;
  conversationId: string;
  createdByEmail: string;
  expiresAt: string;
}): Promise<void> {
  const supabase = getInboxSupabase();
  const { error } = await supabase.from(INVITES_TABLE).upsert(
    {
      owner_email: input.ownerEmail,
      invite_id: input.inviteId,
      conversation_id: input.conversationId,
      created_by_email: input.createdByEmail,
      expires_at: input.expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_email,invite_id" },
  );

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to create invite: ${error.message}`,
    );
  }
}

export async function getCalendlyInvite(input: {
  ownerEmail: string;
  inviteId: string;
}): Promise<InboxCalendlyInviteRow | null> {
  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(INVITES_TABLE)
    .select(
      "owner_email,invite_id,conversation_id,created_by_email,expires_at,consumed_at,consumed_event_uri,created_at,updated_at",
    )
    .eq("owner_email", input.ownerEmail)
    .eq("invite_id", input.inviteId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to load invite: ${error.message}`,
    );
  }
  return (data as InboxCalendlyInviteRow | null) ?? null;
}

export async function consumeCalendlyInviteIfUnused(input: {
  ownerEmail: string;
  inviteId: string;
  consumedEventUri?: string;
}): Promise<boolean> {
  const supabase = getInboxSupabase();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from(INVITES_TABLE)
    .update({
      consumed_at: nowIso,
      consumed_event_uri: input.consumedEventUri ?? null,
      updated_at: nowIso,
    })
    .eq("owner_email", input.ownerEmail)
    .eq("invite_id", input.inviteId)
    .is("consumed_at", null)
    .gt("expires_at", nowIso)
    .select("invite_id")
    .limit(1);

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to consume invite: ${error.message}`,
    );
  }
  return Array.isArray(data) && data.length > 0;
}
