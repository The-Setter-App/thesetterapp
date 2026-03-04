import { createHash, randomBytes } from "node:crypto";
import { buildConversationTrackingHash } from "@/lib/calendly/tracking";
import { decryptData, encryptData } from "@/lib/crypto";
import { getInboxSupabase } from "@/lib/inbox/repository/core";
import type {
  InboxCalendlyInviteRow,
  InboxCallEventRow,
  WorkspaceCalendlyConnectionRow,
} from "@/lib/supabase/types";
import type {
  CalendlyCallStatus,
  CalendlyConnection,
  ConversationCallEvent,
  WorkspaceCalendarCallEvent,
} from "@/types/calendly";

const CALENDLY_CONNECTIONS_TABLE = "workspace_calendly_connections";
const INBOX_CALL_EVENTS_TABLE = "inbox_call_events";
const CONVERSATIONS_TABLE = "inbox_conversations";
const MESSAGES_TABLE = "inbox_messages";
const INVITES_TABLE = "inbox_calendly_invites";

function mapConnectionRow(
  row: WorkspaceCalendlyConnectionRow,
): CalendlyConnection {
  return {
    id: row.id,
    workspaceOwnerEmail: row.workspace_owner_email,
    schedulingUrl: row.scheduling_url,
    isConnected: row.is_connected,
    connectedAt: row.connected_at,
    webhookSubscriptionUri: row.webhook_subscription_uri ?? undefined,
  };
}

function mapCallRow(row: InboxCallEventRow): ConversationCallEvent {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    eventType:
      row.event_type === "invitee.created" ||
      row.event_type === "invitee.canceled" ||
      row.event_type === "invitee.rescheduled"
        ? row.event_type
        : "invitee.created",
    status:
      row.status === "booked" ||
      row.status === "canceled" ||
      row.status === "rescheduled"
        ? row.status
        : "unknown",
    title: row.title,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone ?? "UTC",
    joinUrl: row.join_url ?? undefined,
    cancelUrl: row.cancel_url ?? undefined,
    rescheduleUrl: row.reschedule_url ?? undefined,
    inviteeName: row.invitee_name ?? undefined,
    inviteeEmail: row.invitee_email ?? undefined,
    calendlyEventUri: row.calendly_event_uri ?? undefined,
    calendlyInviteeUri: row.calendly_invitee_uri ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toLeadNameFromConversationPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const typed = payload as { name?: string };
  return typeof typed.name === "string" ? typed.name.trim() : "";
}

function toAmountFromConversationPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const typed = payload as { paymentDetails?: { amount?: string } };
  const amount = typed.paymentDetails?.amount;
  if (typeof amount !== "string") return undefined;
  const trimmed = amount.trim();
  return trimmed || undefined;
}

export async function getCalendlyConnectionByOwnerEmail(
  workspaceOwnerEmail: string,
): Promise<CalendlyConnection | null> {
  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(CALENDLY_CONNECTIONS_TABLE)
    .select(
      "id,workspace_owner_email,personal_access_token,scheduling_url,webhook_signing_key,webhook_subscription_uri,is_connected,connected_at,created_at,updated_at",
    )
    .eq("workspace_owner_email", workspaceOwnerEmail)
    .eq("is_connected", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to load connection: ${error.message}`,
    );
  }
  if (!data) return null;
  return mapConnectionRow(data as WorkspaceCalendlyConnectionRow);
}

export async function getCalendlyConnectionSecretByOwnerEmail(
  workspaceOwnerEmail: string,
): Promise<{
  id: string;
  personalAccessToken: string;
  webhookSigningKey: string;
  webhookSubscriptionUri?: string;
  schedulingUrl: string;
} | null> {
  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(CALENDLY_CONNECTIONS_TABLE)
    .select(
      "id,workspace_owner_email,personal_access_token,scheduling_url,webhook_signing_key,webhook_subscription_uri,is_connected,connected_at,created_at,updated_at",
    )
    .eq("workspace_owner_email", workspaceOwnerEmail)
    .eq("is_connected", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to load connection secret: ${error.message}`,
    );
  }
  if (!data) return null;
  const row = data as WorkspaceCalendlyConnectionRow;
  return {
    id: row.id,
    personalAccessToken: decryptData(row.personal_access_token),
    webhookSigningKey: decryptData(row.webhook_signing_key),
    webhookSubscriptionUri: row.webhook_subscription_uri ?? undefined,
    schedulingUrl: row.scheduling_url,
  };
}

export async function getCalendlyConnectionSecretById(id: string): Promise<{
  id: string;
  workspaceOwnerEmail: string;
  personalAccessToken: string;
  webhookSigningKey: string;
  webhookSubscriptionUri?: string;
  schedulingUrl: string;
} | null> {
  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(CALENDLY_CONNECTIONS_TABLE)
    .select(
      "id,workspace_owner_email,personal_access_token,scheduling_url,webhook_signing_key,webhook_subscription_uri,is_connected,connected_at,created_at,updated_at",
    )
    .eq("id", id)
    .eq("is_connected", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to load connection by id: ${error.message}`,
    );
  }
  if (!data) return null;
  const row = data as WorkspaceCalendlyConnectionRow;
  return {
    id: row.id,
    workspaceOwnerEmail: row.workspace_owner_email,
    personalAccessToken: decryptData(row.personal_access_token),
    webhookSigningKey: decryptData(row.webhook_signing_key),
    webhookSubscriptionUri: row.webhook_subscription_uri ?? undefined,
    schedulingUrl: row.scheduling_url,
  };
}

export async function upsertCalendlyConnection(input: {
  workspaceOwnerEmail: string;
  personalAccessToken: string;
  schedulingUrl: string;
  webhookSigningKey: string;
  webhookSubscriptionUri?: string;
}): Promise<CalendlyConnection> {
  const supabase = getInboxSupabase();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from(CALENDLY_CONNECTIONS_TABLE)
    .upsert(
      {
        workspace_owner_email: input.workspaceOwnerEmail,
        personal_access_token: encryptData(input.personalAccessToken),
        scheduling_url: input.schedulingUrl,
        webhook_signing_key: encryptData(input.webhookSigningKey),
        webhook_subscription_uri: input.webhookSubscriptionUri ?? null,
        is_connected: true,
        connected_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "workspace_owner_email" },
    )
    .select(
      "id,workspace_owner_email,personal_access_token,scheduling_url,webhook_signing_key,webhook_subscription_uri,is_connected,connected_at,created_at,updated_at",
    )
    .single();

  if (error || !data) {
    throw new Error(
      `[CalendlyRepository] Failed to upsert connection: ${error?.message || "Unknown error"}`,
    );
  }
  return mapConnectionRow(data as WorkspaceCalendlyConnectionRow);
}

export async function disconnectCalendlyConnection(
  workspaceOwnerEmail: string,
): Promise<void> {
  const supabase = getInboxSupabase();
  const { error } = await supabase
    .from(CALENDLY_CONNECTIONS_TABLE)
    .update({
      is_connected: false,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_owner_email", workspaceOwnerEmail);
  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to disconnect connection: ${error.message}`,
    );
  }
}

export function generateWebhookSigningKey(): string {
  return randomBytes(32).toString("hex");
}

export function buildCallEventId(input: {
  ownerEmail: string;
  calendlyEventUri?: string;
  calendlyInviteeUri?: string;
  startTime: string;
}): string {
  const basis = [
    input.ownerEmail.toLowerCase(),
    input.calendlyEventUri || "",
    input.calendlyInviteeUri || "",
    input.startTime,
  ].join("|");
  return createHash("sha256").update(basis).digest("hex").slice(0, 40);
}

export async function upsertConversationCallEvent(input: {
  ownerEmail: string;
  id: string;
  conversationId: string | null;
  eventType: string;
  status: CalendlyCallStatus;
  title: string;
  startTime: string;
  endTime: string;
  timezone: string;
  joinUrl?: string;
  cancelUrl?: string;
  rescheduleUrl?: string;
  inviteeName?: string;
  inviteeEmail?: string;
  calendlyEventUri?: string;
  calendlyInviteeUri?: string;
  rawPayload: unknown;
}): Promise<void> {
  const supabase = getInboxSupabase();
  const { error } = await supabase.from(INBOX_CALL_EVENTS_TABLE).upsert(
    {
      owner_email: input.ownerEmail,
      id: input.id,
      conversation_id: input.conversationId,
      calendly_event_uri: input.calendlyEventUri ?? null,
      calendly_invitee_uri: input.calendlyInviteeUri ?? null,
      event_type: input.eventType,
      status: input.status,
      title: input.title,
      start_time: input.startTime,
      end_time: input.endTime,
      timezone: input.timezone,
      join_url: input.joinUrl ?? null,
      cancel_url: input.cancelUrl ?? null,
      reschedule_url: input.rescheduleUrl ?? null,
      invitee_name: input.inviteeName ?? null,
      invitee_email: input.inviteeEmail ?? null,
      raw_payload: input.rawPayload ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_email,id" },
  );
  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to upsert call event: ${error.message}`,
    );
  }
}

export async function getConversationCallEvents(
  ownerEmail: string,
  conversationId: string,
): Promise<ConversationCallEvent[]> {
  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(INBOX_CALL_EVENTS_TABLE)
    .select(
      "owner_email,id,conversation_id,calendly_event_uri,calendly_invitee_uri,event_type,status,title,start_time,end_time,timezone,join_url,cancel_url,reschedule_url,invitee_name,invitee_email,raw_payload,created_at,updated_at",
    )
    .eq("owner_email", ownerEmail)
    .eq("conversation_id", conversationId)
    .order("start_time", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to list call events: ${error.message}`,
    );
  }

  return ((data || []) as InboxCallEventRow[]).map(mapCallRow);
}

export async function getWorkspaceCallEventsByRange(input: {
  ownerEmail: string;
  fromIso: string;
  toIso: string;
}): Promise<WorkspaceCalendarCallEvent[]> {
  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(INBOX_CALL_EVENTS_TABLE)
    .select(
      "owner_email,id,conversation_id,calendly_event_uri,calendly_invitee_uri,event_type,status,title,start_time,end_time,timezone,join_url,cancel_url,reschedule_url,invitee_name,invitee_email,raw_payload,created_at,updated_at",
    )
    .eq("owner_email", input.ownerEmail)
    .gte("start_time", input.fromIso)
    .lt("start_time", input.toIso)
    .order("start_time", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(2000);

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to list workspace call events: ${error.message}`,
    );
  }

  const rows = (data || []) as InboxCallEventRow[];
  const conversationIds = Array.from(
    new Set(
      rows
        .map((row) => row.conversation_id)
        .filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0,
        ),
    ),
  );

  const conversationMap = new Map<
    string,
    { leadName: string; amount?: string }
  >();
  if (conversationIds.length > 0) {
    const { data: conversations, error: conversationError } = await supabase
      .from(CONVERSATIONS_TABLE)
      .select("id,payload")
      .eq("owner_email", input.ownerEmail)
      .in("id", conversationIds);

    if (conversationError) {
      throw new Error(
        `[CalendlyRepository] Failed to load conversations for call events: ${conversationError.message}`,
      );
    }

    const conversationRows = (conversations || []) as Array<{
      id: string;
      payload?: unknown;
    }>;
    for (const row of conversationRows) {
      conversationMap.set(row.id, {
        leadName: toLeadNameFromConversationPayload(row.payload),
        amount: toAmountFromConversationPayload(row.payload),
      });
    }
  }

  return rows.map((row) => {
    const mapped = mapCallRow(row);
    const conversationDetails = row.conversation_id
      ? conversationMap.get(row.conversation_id)
      : undefined;
    const leadName =
      conversationDetails?.leadName ||
      row.invitee_name ||
      row.invitee_email ||
      "Unknown lead";

    return {
      ...mapped,
      leadName,
      amount: conversationDetails?.amount,
    };
  });
}

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
    timestamp_text?: string | null;
  }>;

  const matched = rows.find((row) => {
    const text = row.payload?.text || "";
    return typeof text === "string" && text.includes(prefix);
  });

  return matched?.conversation_id ?? null;
}

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
  const { data, error } = await supabase
    .from(INVITES_TABLE)
    .update({
      consumed_at: new Date().toISOString(),
      consumed_event_uri: input.consumedEventUri ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_email", input.ownerEmail)
    .eq("invite_id", input.inviteId)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("invite_id")
    .limit(1);

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to consume invite: ${error.message}`,
    );
  }
  return Array.isArray(data) && data.length > 0;
}
