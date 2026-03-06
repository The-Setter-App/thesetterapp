import { createHash } from "node:crypto";
import { getInboxSupabase } from "@/lib/inbox/repository/core";
import type { InboxCallEventRow } from "@/lib/supabase/types";
import type {
  CalendlyCallStatus,
  CalendlyQuestionAnswer,
  ConversationCallEvent,
  WorkspaceCalendarCallEvent,
} from "@/types/calendly";
import {
  CALL_EVENT_SELECT_COLUMNS,
  CONVERSATIONS_TABLE,
  INBOX_CALL_EVENTS_TABLE,
  mapCallRow,
  toAmountFromConversationPayload,
  toLeadNameFromConversationPayload,
} from "./repository.shared";

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
  preCallAnswers?: CalendlyQuestionAnswer[];
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
      pre_call_answers: input.preCallAnswers ?? null,
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
    .select(CALL_EVENT_SELECT_COLUMNS)
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

async function loadConversationDetailsById(input: {
  ownerEmail: string;
  conversationIds: string[];
}): Promise<Map<string, { leadName: string; amount?: string }>> {
  const conversationMap = new Map<
    string,
    { leadName: string; amount?: string }
  >();
  if (input.conversationIds.length === 0) {
    return conversationMap;
  }

  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .select("id,payload")
    .eq("owner_email", input.ownerEmail)
    .in("id", input.conversationIds);

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to load conversations for call events: ${error.message}`,
    );
  }

  const rows = (data || []) as Array<{
    id: string;
    payload?: unknown;
  }>;
  for (const row of rows) {
    conversationMap.set(row.id, {
      leadName: toLeadNameFromConversationPayload(row.payload),
      amount: toAmountFromConversationPayload(row.payload),
    });
  }

  return conversationMap;
}

function toWorkspaceCalendarCallEvent(
  row: InboxCallEventRow,
  conversationMap: Map<string, { leadName: string; amount?: string }>,
): WorkspaceCalendarCallEvent {
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
}

export async function getWorkspaceCallEventsByRange(input: {
  ownerEmail: string;
  fromIso: string;
  toIso: string;
}): Promise<WorkspaceCalendarCallEvent[]> {
  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(INBOX_CALL_EVENTS_TABLE)
    .select(CALL_EVENT_SELECT_COLUMNS)
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
  const conversationMap = await loadConversationDetailsById({
    ownerEmail: input.ownerEmail,
    conversationIds,
  });

  return rows.map((row) => toWorkspaceCalendarCallEvent(row, conversationMap));
}

export async function getCallEventById(input: {
  ownerEmail: string;
  id: string;
}): Promise<ConversationCallEvent | null> {
  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(INBOX_CALL_EVENTS_TABLE)
    .select(CALL_EVENT_SELECT_COLUMNS)
    .eq("owner_email", input.ownerEmail)
    .eq("id", input.id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to load call event by id: ${error.message}`,
    );
  }

  if (!data) return null;
  return mapCallRow(data as InboxCallEventRow);
}

export async function getWorkspaceCallEventById(input: {
  ownerEmail: string;
  id: string;
}): Promise<WorkspaceCalendarCallEvent | null> {
  const call = await getCallEventById(input);
  if (!call) return null;

  let leadName = call.inviteeName || call.inviteeEmail || "Unknown lead";
  let amount: string | undefined;

  if (call.conversationId) {
    const supabase = getInboxSupabase();
    const { data, error } = await supabase
      .from(CONVERSATIONS_TABLE)
      .select("payload")
      .eq("owner_email", input.ownerEmail)
      .eq("id", call.conversationId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `[CalendlyRepository] Failed to load conversation for call event by id: ${error.message}`,
      );
    }

    if (data) {
      const payload = (data as { payload?: unknown }).payload;
      leadName = toLeadNameFromConversationPayload(payload) || leadName;
      amount = toAmountFromConversationPayload(payload);
    }
  }

  return {
    ...call,
    leadName,
    amount,
  };
}

export async function updateCallEventPreCallAnswers(input: {
  ownerEmail: string;
  id: string;
  preCallAnswers: CalendlyQuestionAnswer[];
}): Promise<void> {
  const supabase = getInboxSupabase();
  const { error } = await supabase
    .from(INBOX_CALL_EVENTS_TABLE)
    .update({
      pre_call_answers: input.preCallAnswers,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_email", input.ownerEmail)
    .eq("id", input.id);

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to update pre-call answers: ${error.message}`,
    );
  }
}
