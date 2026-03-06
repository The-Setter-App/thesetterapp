import { createHmac } from "node:crypto";
import {
  deleteCalendlyWebhookSubscription,
  getCalendlyInviteeDetails,
} from "@/lib/calendly/client";
import {
  type CalendlyOAuthTokenSet,
  refreshCalendlyOAuthToken,
  toOAuthAccessTokenExpiresAtIso,
} from "@/lib/calendly/oauth";
import {
  type CalendlyConnectionSecret,
  getCalendlyConnectionSecretByOwnerEmail,
  getCallEventById,
  updateCalendlyConnectionOAuthTokens,
  updateCallEventPreCallAnswers,
} from "@/lib/calendly/repository";
import { emitWorkspaceSseEvent } from "@/lib/inbox/sseBus";
import {
  addStatusTimelineEvent,
  updateUserStatus,
} from "@/lib/inboxRepository";
import { normalizeStatusKey } from "@/lib/status/config";
import { listWorkspaceStatusNames } from "@/lib/tagsRepository";
import type {
  CalendlyCallStatus,
  CalendlyQuestionAnswer,
  CalendlySchedulingUrlInput,
} from "@/types/calendly";

export function normalizeCalendlyUrl(value: string): string {
  const trimmed = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Scheduling URL must be a valid URL.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Scheduling URL must use HTTPS.");
  }
  if (!parsed.hostname.toLowerCase().includes("calendly.com")) {
    throw new Error("Scheduling URL must be a Calendly URL.");
  }
  return parsed.toString();
}

export function getAppUrl(): string {
  const value = process.env.APP_URL?.trim();
  if (!value) {
    throw new Error("APP_URL must be configured.");
  }
  return value.replace(/\/+$/g, "");
}

export function resolveCallStatus(input: {
  eventType: string;
  isRescheduled: boolean;
}): CalendlyCallStatus {
  if (input.eventType === "invitee.created" && input.isRescheduled) {
    return "rescheduled";
  }
  if (input.eventType === "invitee.created") return "booked";
  if (input.eventType === "invitee.canceled") return "canceled";
  return "unknown";
}

export function isRescheduledCreatedEvent(payload: {
  old_invitee?: string;
  rescheduled?: boolean;
}): boolean {
  if (payload.rescheduled === true) return true;
  return (
    typeof payload.old_invitee === "string" &&
    payload.old_invitee.trim().length > 0
  );
}

export function resolveJoinUrl(payload: {
  location?: { join_url?: string; location?: string; type?: string };
}): string | undefined {
  const joinUrl = payload.location?.join_url?.trim();
  if (joinUrl) return joinUrl;

  const locationValue = payload.location?.location?.trim();
  if (
    locationValue?.startsWith("http://") ||
    locationValue?.startsWith("https://")
  ) {
    return locationValue;
  }
  return undefined;
}

export function resolveCallTitle(payload: {
  event_type?:
    | string
    | {
        uri?: string;
        name?: string;
      };
  scheduled_event?: {
    name?: string;
  };
}): string {
  const eventTypeField = payload.event_type;
  if (eventTypeField && typeof eventTypeField === "object") {
    const explicitName = eventTypeField.name?.trim();
    if (explicitName) return explicitName;
  }

  const scheduledName = payload.scheduled_event?.name?.trim();
  if (scheduledName) return scheduledName;

  return "Scheduled Call";
}

export function resolveScheduledWindow(input: {
  payload: {
    start_time?: string;
    end_time?: string;
    timezone?: string;
    scheduled_event?: {
      start_time?: string;
      end_time?: string;
      timezone?: string;
    };
  };
  webhookCreatedAt?: string;
}): { startTime: string; endTime: string; timezone: string } {
  const scheduledEvent = input.payload.scheduled_event;
  const startTime =
    scheduledEvent?.start_time ||
    input.payload.start_time ||
    input.webhookCreatedAt ||
    new Date().toISOString();
  const endTime =
    scheduledEvent?.end_time || input.payload.end_time || startTime;
  const timezone = scheduledEvent?.timezone || input.payload.timezone || "UTC";

  return { startTime, endTime, timezone };
}

export function resolveInviteeUri(payload: {
  invitee?: string;
  uri?: string;
}): string | undefined {
  const inviteeUri = payload.invitee?.trim();
  if (inviteeUri) return inviteeUri;

  const resourceUri = payload.uri?.trim();
  return resourceUri || undefined;
}

export function normalizeCalendlyPreCallAnswers(
  answers: CalendlyQuestionAnswer[],
): CalendlyQuestionAnswer[] {
  return answers
    .map((answer, index) => ({
      question: answer.question.trim(),
      answer: answer.answer.trim(),
      position:
        Number.isFinite(answer.position) && answer.position >= 0
          ? answer.position
          : index,
    }))
    .filter((answer) => answer.question.length > 0 && answer.answer.length > 0)
    .sort((a, b) => a.position - b.position);
}

export function resolveWebhookPreCallAnswers(payload: {
  questions_and_answers?: Array<{
    question?: string;
    answer?: string;
    position?: number;
  }>;
}): CalendlyQuestionAnswer[] | undefined {
  const answers = normalizeCalendlyPreCallAnswers(
    (payload.questions_and_answers ?? []).map((answer, index) => ({
      question: typeof answer.question === "string" ? answer.question : "",
      answer: typeof answer.answer === "string" ? answer.answer : "",
      position:
        typeof answer.position === "number" && Number.isFinite(answer.position)
          ? answer.position
          : index,
    })),
  );

  return answers.length > 0 ? answers : undefined;
}

export function verifyWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
  signingKey: string;
}): boolean {
  if (!input.signatureHeader) return false;
  const chunks = input.signatureHeader.split(",").map((chunk) => chunk.trim());
  const timestampPart = chunks.find((chunk) => chunk.startsWith("t="));
  const signaturePart = chunks.find((chunk) => chunk.startsWith("v1="));
  if (!timestampPart || !signaturePart) return false;

  const timestamp = timestampPart.slice(2);
  const incoming = signaturePart.slice(3);
  if (!timestamp || !incoming) return false;

  const signedPayload = `${timestamp}.${input.rawBody}`;
  const expected = createHmac("sha256", input.signingKey)
    .update(signedPayload)
    .digest("hex");
  return expected === incoming;
}

const ACCESS_TOKEN_REFRESH_WINDOW_MS = 2 * 60 * 1000;

function isTokenRefreshRequired(expiresAtIso: string): boolean {
  const expiresAtMs = new Date(expiresAtIso).getTime();
  if (!Number.isFinite(expiresAtMs)) return true;
  return expiresAtMs - Date.now() <= ACCESS_TOKEN_REFRESH_WINDOW_MS;
}

export function toMaskedOauthCredential(accessToken: string): string {
  const trimmed = accessToken.trim();
  const suffix = trimmed.slice(-4);
  return `OAuth ****${suffix || "****"}`;
}

export function buildCalendlyWebhookUrl(integrationId: string): string {
  return `${getAppUrl()}/api/integrations/calendly/webhook/${encodeURIComponent(integrationId)}`;
}

export function toCalendlyConnectionUpsertInput(input: {
  workspaceOwnerEmail: string;
  tokenSet: CalendlyOAuthTokenSet;
  oauthAccessTokenExpiresAt: string;
  user: {
    userUri: string;
    organizationUri: string;
  };
  schedulingUrl: string;
  webhookSigningKey: string;
  webhookSubscriptionUri?: string;
}) {
  return {
    workspaceOwnerEmail: input.workspaceOwnerEmail,
    oauthAccessToken: input.tokenSet.accessToken,
    oauthRefreshToken: input.tokenSet.refreshToken,
    oauthAccessTokenExpiresAt: input.oauthAccessTokenExpiresAt,
    oauthScope: input.tokenSet.scope,
    oauthTokenType: input.tokenSet.tokenType,
    calendlyUserUri: input.user.userUri,
    organizationUri: input.user.organizationUri,
    schedulingUrl: input.schedulingUrl,
    webhookSigningKey: input.webhookSigningKey,
    webhookSubscriptionUri: input.webhookSubscriptionUri,
  };
}

export async function deletePreviousWebhookIfPresent(
  previous: CalendlyConnectionSecret | null,
) {
  if (!previous?.webhookSubscriptionUri) return;
  await deleteCalendlyWebhookSubscription({
    accessToken: previous.oauthAccessToken,
    webhookSubscriptionUri: previous.webhookSubscriptionUri,
  });
}

export async function ensureFreshConnectionSecret(
  secret: CalendlyConnectionSecret,
): Promise<CalendlyConnectionSecret> {
  if (!isTokenRefreshRequired(secret.oauthAccessTokenExpiresAt)) {
    return secret;
  }

  const refreshed = await refreshCalendlyOAuthToken({
    refreshToken: secret.oauthRefreshToken,
  });
  const oauthAccessTokenExpiresAt = toOAuthAccessTokenExpiresAtIso(
    refreshed.expiresInSeconds,
  );
  await updateCalendlyConnectionOAuthTokens({
    workspaceOwnerEmail: secret.workspaceOwnerEmail,
    oauthAccessToken: refreshed.accessToken,
    oauthRefreshToken: refreshed.refreshToken,
    oauthAccessTokenExpiresAt,
    oauthScope: refreshed.scope,
    oauthTokenType: refreshed.tokenType,
  });

  return {
    ...secret,
    oauthAccessToken: refreshed.accessToken,
    oauthRefreshToken: refreshed.refreshToken,
    oauthAccessTokenExpiresAt,
    oauthScope: refreshed.scope,
    oauthTokenType: refreshed.tokenType,
  };
}

export async function maybeFetchCalendlyPreCallAnswers(input: {
  ownerEmail: string;
  inviteeUri?: string;
}): Promise<CalendlyQuestionAnswer[] | undefined> {
  const inviteeUri = input.inviteeUri?.trim();
  if (!inviteeUri) return undefined;

  const secret = await getCalendlyConnectionSecretByOwnerEmail(
    input.ownerEmail,
  );
  if (!secret) return undefined;

  const freshSecret = await ensureFreshConnectionSecret(secret);
  const invitee = await getCalendlyInviteeDetails({
    accessToken: freshSecret.oauthAccessToken,
    inviteeUri,
  });
  const normalizedAnswers = normalizeCalendlyPreCallAnswers(
    invitee.questionsAndAnswers,
  );
  return normalizedAnswers.length > 0 ? normalizedAnswers : undefined;
}

export async function ensureCallEventPreCallAnswers(input: {
  ownerEmail: string;
  eventId: string;
}): Promise<void> {
  const existing = await getCallEventById({
    ownerEmail: input.ownerEmail,
    id: input.eventId,
  });
  if (!existing) {
    throw new Error("Call event not found.");
  }
  if ((existing.preCallAnswers?.length ?? 0) > 0) {
    return;
  }
  if (!existing.calendlyInviteeUri) {
    return;
  }

  try {
    const answers = await maybeFetchCalendlyPreCallAnswers({
      ownerEmail: input.ownerEmail,
      inviteeUri: existing.calendlyInviteeUri,
    });
    if (!answers) return;

    await updateCallEventPreCallAnswers({
      ownerEmail: input.ownerEmail,
      id: input.eventId,
      preCallAnswers: answers,
    });
  } catch (error) {
    console.warn("[CalendlyService] Failed to enrich pre-call answers.", error);
  }
}

export async function maybeApplyBookedStatus(input: {
  ownerEmail: string;
  conversationId: string | null;
  status: CalendlyCallStatus;
}) {
  if (!input.conversationId) return;
  if (input.status !== "booked") return;

  const statusNames = await listWorkspaceStatusNames(input.ownerEmail);
  const booked = statusNames.find(
    (name) => normalizeStatusKey(name) === normalizeStatusKey("Booked"),
  );
  if (!booked) return;

  await updateUserStatus(input.conversationId, input.ownerEmail, booked);
  await addStatusTimelineEvent(input.conversationId, input.ownerEmail, booked);
  emitWorkspaceSseEvent(input.ownerEmail, {
    type: "user_status_updated",
    timestamp: new Date().toISOString(),
    data: { conversationId: input.conversationId, status: booked },
  });
}

export function assertCalendlySchedulingInput(
  input: CalendlySchedulingUrlInput,
): string {
  return normalizeCalendlyUrl(input.schedulingUrl);
}
