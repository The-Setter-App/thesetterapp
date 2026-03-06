import { decryptData } from "@/lib/crypto";
import type {
  InboxCallEventRow,
  WorkspaceCalendlyConnectionRow,
} from "@/lib/supabase/types";
import type {
  CalendlyConnection,
  CalendlyPreCallAnswersStatus,
  CalendlyQuestionAnswer,
  ConversationCallEvent,
} from "@/types/calendly";

export const CALENDLY_CONNECTIONS_TABLE = "workspace_calendly_connections";
export const INBOX_CALL_EVENTS_TABLE = "inbox_call_events";
export const CONVERSATIONS_TABLE = "inbox_conversations";
export const MESSAGES_TABLE = "inbox_messages";
export const INVITES_TABLE = "inbox_calendly_invites";
export const CALL_EVENT_SELECT_COLUMNS =
  "owner_email,id,conversation_id,calendly_event_uri,calendly_invitee_uri,event_type,status,title,start_time,end_time,timezone,join_url,cancel_url,reschedule_url,invitee_name,invitee_email,pre_call_answers,raw_payload,created_at,updated_at";
export const CONNECTION_SELECT_COLUMNS =
  "id,workspace_owner_email,oauth_access_token,oauth_refresh_token,oauth_access_token_expires_at,oauth_scope,oauth_token_type,calendly_user_uri,organization_uri,scheduling_url,webhook_signing_key,webhook_subscription_uri,is_connected,connected_at,created_at,updated_at";

export interface CalendlyConnectionSecret {
  id: string;
  workspaceOwnerEmail: string;
  oauthAccessToken: string;
  oauthRefreshToken: string;
  oauthAccessTokenExpiresAt: string;
  oauthScope?: string;
  oauthTokenType?: string;
  calendlyUserUri?: string;
  organizationUri?: string;
  webhookSigningKey: string;
  webhookSubscriptionUri?: string;
  schedulingUrl: string;
}

export function mapConnectionRow(
  row: WorkspaceCalendlyConnectionRow,
): CalendlyConnection {
  return {
    id: row.id,
    workspaceOwnerEmail: row.workspace_owner_email,
    schedulingUrl: row.scheduling_url,
    isConnected: row.is_connected,
    connectedAt: row.connected_at,
    oauthAccessTokenExpiresAt: row.oauth_access_token_expires_at,
    oauthScope: row.oauth_scope ?? undefined,
    oauthTokenType: row.oauth_token_type ?? undefined,
    calendlyUserUri: row.calendly_user_uri ?? undefined,
    organizationUri: row.organization_uri ?? undefined,
    webhookSubscriptionUri: row.webhook_subscription_uri ?? undefined,
  };
}

export function mapConnectionSecretRow(
  row: WorkspaceCalendlyConnectionRow,
): CalendlyConnectionSecret {
  return {
    id: row.id,
    workspaceOwnerEmail: row.workspace_owner_email,
    oauthAccessToken: decryptData(row.oauth_access_token),
    oauthRefreshToken: decryptData(row.oauth_refresh_token),
    oauthAccessTokenExpiresAt: row.oauth_access_token_expires_at,
    oauthScope: row.oauth_scope ?? undefined,
    oauthTokenType: row.oauth_token_type ?? undefined,
    calendlyUserUri: row.calendly_user_uri ?? undefined,
    organizationUri: row.organization_uri ?? undefined,
    webhookSigningKey: decryptData(row.webhook_signing_key),
    webhookSubscriptionUri: row.webhook_subscription_uri ?? undefined,
    schedulingUrl: row.scheduling_url,
  };
}

export function mapCallRow(row: InboxCallEventRow): ConversationCallEvent {
  const preCallAnswers = toCalendlyQuestionAnswers(row.pre_call_answers);
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
    preCallAnswers,
    preCallAnswersStatus: resolvePreCallAnswersStatus({
      answers: preCallAnswers,
      rawPayload: row.raw_payload,
    }),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCalendlyQuestionAnswers(
  value: unknown,
): CalendlyQuestionAnswer[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const answers = value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const typed = item as {
        question?: unknown;
        answer?: unknown;
        position?: unknown;
      };
      const question =
        typeof typed.question === "string" ? typed.question.trim() : "";
      const answer =
        typeof typed.answer === "string" ? typed.answer.trim() : "";
      if (!question || !answer) return null;

      const position =
        typeof typed.position === "number" && Number.isFinite(typed.position)
          ? typed.position
          : index;
      return { question, answer, position };
    })
    .filter((item): item is CalendlyQuestionAnswer => Boolean(item));

  return answers.length > 0 ? answers : undefined;
}

function resolvePreCallAnswersStatus(input: {
  answers?: CalendlyQuestionAnswer[];
  rawPayload: unknown;
}): CalendlyPreCallAnswersStatus {
  if ((input.answers?.length ?? 0) > 0) {
    return "available";
  }

  if (!input.rawPayload || typeof input.rawPayload !== "object") {
    return "missing";
  }
  const typed = input.rawPayload as {
    payload?: { invitee?: unknown; uri?: unknown };
  };
  const inviteeUri =
    typeof typed.payload?.invitee === "string" && typed.payload.invitee.trim()
      ? typed.payload.invitee
      : typeof typed.payload?.uri === "string" && typed.payload.uri.trim()
        ? typed.payload.uri
        : "";

  return inviteeUri.length > 0 ? "missing" : "unavailable";
}

export function toLeadNameFromConversationPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const typed = payload as { name?: string };
  return typeof typed.name === "string" ? typed.name.trim() : "";
}

export function toAmountFromConversationPayload(
  payload: unknown,
): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const typed = payload as { paymentDetails?: { amount?: string } };
  const amount = typed.paymentDetails?.amount;
  if (typeof amount !== "string") return undefined;
  const trimmed = amount.trim();
  return trimmed || undefined;
}
