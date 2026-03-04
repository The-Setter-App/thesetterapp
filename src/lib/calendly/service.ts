import { createHmac } from "node:crypto";
import { emitWorkspaceSseEvent } from "@/app/api/sse/route";
import {
  createCalendlyWebhookSubscription,
  deleteCalendlyWebhookSubscription,
  parseCalendlyWebhookBody,
  validateCalendlyTokenAndGetOrganization,
} from "@/lib/calendly/client";
import {
  buildCallEventId,
  consumeCalendlyInviteIfUnused,
  createCalendlyInvite,
  disconnectCalendlyConnection,
  findConversationIdByContactEmail,
  findConversationIdByTrackingHash,
  findConversationIdByTrackingTokenPrefix,
  generateInviteId,
  generateWebhookSigningKey,
  getCalendlyConnectionByOwnerEmail,
  getCalendlyConnectionSecretById,
  getCalendlyConnectionSecretByOwnerEmail,
  getCalendlyInvite,
  getConversationCallEvents,
  getWorkspaceCallEventsByRange,
  upsertCalendlyConnection,
  upsertConversationCallEvent,
} from "@/lib/calendly/repository";
import {
  buildTrackingToken,
  parseTrackingToken,
} from "@/lib/calendly/tracking";
import {
  addStatusTimelineEvent,
  updateUserStatus,
} from "@/lib/inboxRepository";
import { normalizeStatusKey } from "@/lib/status/config";
import { listWorkspaceStatusNames } from "@/lib/tagsRepository";
import type {
  CalendlyCallStatus,
  CalendlyConnectionInput,
  WorkspaceCalendarCallEvent,
} from "@/types/calendly";

function normalizeCalendlyUrl(value: string): string {
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

function getAppUrl(): string {
  const value = process.env.APP_URL?.trim();
  if (!value) {
    throw new Error("APP_URL must be configured.");
  }
  return value.replace(/\/+$/g, "");
}

function resolveCallStatus(input: {
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

function isRescheduledCreatedEvent(payload: {
  old_invitee?: string;
  rescheduled?: boolean;
}): boolean {
  if (payload.rescheduled === true) return true;
  return (
    typeof payload.old_invitee === "string" &&
    payload.old_invitee.trim().length > 0
  );
}

function resolveJoinUrl(payload: {
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

function verifyWebhookSignature(input: {
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

export async function connectCalendlyForWorkspace(
  workspaceOwnerEmail: string,
  input: CalendlyConnectionInput,
) {
  const personalAccessToken = input.personalAccessToken.trim();
  if (personalAccessToken.length < 20) {
    throw new Error("Personal access token appears invalid.");
  }
  const schedulingUrl = normalizeCalendlyUrl(input.schedulingUrl);

  await validateCalendlyTokenAndGetOrganization(personalAccessToken);
  const previous =
    await getCalendlyConnectionSecretByOwnerEmail(workspaceOwnerEmail);
  const signingKey = generateWebhookSigningKey();

  const provisional = await upsertCalendlyConnection({
    workspaceOwnerEmail,
    personalAccessToken,
    schedulingUrl,
    webhookSigningKey: signingKey,
    webhookSubscriptionUri: undefined,
  });

  try {
    const webhookUrl = `${getAppUrl()}/api/integrations/calendly/webhook/${encodeURIComponent(provisional.id)}`;
    const webhook = await createCalendlyWebhookSubscription({
      personalAccessToken,
      webhookUrl,
      signingKey,
    });

    const updated = await upsertCalendlyConnection({
      workspaceOwnerEmail,
      personalAccessToken,
      schedulingUrl,
      webhookSigningKey: signingKey,
      webhookSubscriptionUri: webhook.resourceUri,
    });

    if (previous?.webhookSubscriptionUri) {
      await deleteCalendlyWebhookSubscription({
        personalAccessToken: previous.personalAccessToken,
        webhookSubscriptionUri: previous.webhookSubscriptionUri,
      });
    }

    return updated;
  } catch (error) {
    await disconnectCalendlyConnection(workspaceOwnerEmail);
    throw error;
  }
}

export async function disconnectCalendlyForWorkspace(
  workspaceOwnerEmail: string,
) {
  const existing =
    await getCalendlyConnectionSecretByOwnerEmail(workspaceOwnerEmail);
  if (existing) {
    await deleteCalendlyWebhookSubscription({
      personalAccessToken: existing.personalAccessToken,
      webhookSubscriptionUri: existing.webhookSubscriptionUri,
    });
  }
  await disconnectCalendlyConnection(workspaceOwnerEmail);
}

export async function getCalendlyConnectionState(workspaceOwnerEmail: string) {
  return getCalendlyConnectionByOwnerEmail(workspaceOwnerEmail);
}

export async function buildTrackedBookingLink(input: {
  workspaceOwnerEmail: string;
  conversationId: string;
  createdByEmail: string;
}) {
  const connection = await getCalendlyConnectionSecretByOwnerEmail(
    input.workspaceOwnerEmail,
  );
  if (!connection) {
    throw new Error("Calendly is not connected.");
  }

  const token = buildTrackingToken({
    conversationId: input.conversationId,
    workspaceOwnerEmail: input.workspaceOwnerEmail,
  });
  const inviteId = generateInviteId();
  const expiresAt = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  await createCalendlyInvite({
    ownerEmail: input.workspaceOwnerEmail,
    inviteId,
    conversationId: input.conversationId,
    createdByEmail: input.createdByEmail,
    expiresAt,
  });
  const bookingUrl = new URL(connection.schedulingUrl);
  bookingUrl.searchParams.set("utm_source", "setterapp");
  bookingUrl.searchParams.set("utm_medium", "inbox");
  bookingUrl.searchParams.set("utm_campaign", "dm_booking");
  bookingUrl.searchParams.set("utm_term", `sti:${inviteId}`);
  bookingUrl.searchParams.set("utm_content", `settertrk:${token}`);

  const link = bookingUrl.toString();
  return {
    bookingUrl: link,
    defaultMessage: `Book a time that works for you here: ${link}`,
  };
}

async function maybeApplyBookedStatus(input: {
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

export async function handleCalendlyWebhook(input: {
  integrationId: string;
  rawBody: string;
  signatureHeader: string | null;
}) {
  const connection = await getCalendlyConnectionSecretById(input.integrationId);
  if (!connection) {
    return { accepted: false, reason: "unknown_integration" as const };
  }

  const valid = verifyWebhookSignature({
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    signingKey: connection.webhookSigningKey,
  });
  if (!valid) {
    return { accepted: false, reason: "invalid_signature" as const };
  }

  const parsedRaw = JSON.parse(input.rawBody) as unknown;
  const body = parseCalendlyWebhookBody(parsedRaw);
  const eventType = body.event || "";
  if (eventType !== "invitee.created" && eventType !== "invitee.canceled") {
    return { accepted: true, ignored: true };
  }

  const payload = body.payload || {};
  const isRescheduled =
    eventType === "invitee.created" && isRescheduledCreatedEvent(payload);
  const normalizedEventType = isRescheduled ? "invitee.rescheduled" : eventType;
  const status = resolveCallStatus({
    eventType,
    isRescheduled,
  });
  const trackingValue = payload.tracking?.utm_content || "";
  const trackingTerm = payload.tracking?.utm_term || "";
  const inviteId = trackingTerm.startsWith("sti:")
    ? trackingTerm.slice("sti:".length).trim()
    : "";
  const token = trackingValue.startsWith("settertrk:")
    ? trackingValue.slice("settertrk:".length)
    : "";
  const resolvedFromTracking = parseTrackingToken(token);

  let conversationId: string | null = null;
  if (resolvedFromTracking?.conversationHash) {
    conversationId = await findConversationIdByTrackingHash({
      ownerEmail: connection.workspaceOwnerEmail,
      conversationHash: resolvedFromTracking.conversationHash,
    });
  }
  if (
    !conversationId &&
    typeof payload.email === "string" &&
    payload.email.trim()
  ) {
    conversationId = await findConversationIdByContactEmail({
      ownerEmail: connection.workspaceOwnerEmail,
      email: payload.email,
    });
  }
  if (!conversationId && token) {
    const tokenPrefix = token.replace(/\.\.\.$/, "");
    if (tokenPrefix.length >= 12) {
      conversationId = await findConversationIdByTrackingTokenPrefix({
        ownerEmail: connection.workspaceOwnerEmail,
        tokenPrefix,
      });
    }
  }

  if (!conversationId && inviteId) {
    const invite = await getCalendlyInvite({
      ownerEmail: connection.workspaceOwnerEmail,
      inviteId,
    });
    if (invite && new Date(invite.expires_at).getTime() > Date.now()) {
      conversationId = invite.conversation_id;
    }
  }

  if (eventType === "invitee.created" && inviteId) {
    const consumed = await consumeCalendlyInviteIfUnused({
      ownerEmail: connection.workspaceOwnerEmail,
      inviteId,
      consumedEventUri: payload.event,
    });
    if (!consumed) {
      return {
        accepted: true,
        ignored: true,
        reason: "invite_already_consumed" as const,
      };
    }
  }

  const startTime =
    payload.start_time || body.created_at || new Date().toISOString();
  const endTime = payload.end_time || startTime;
  const eventId = buildCallEventId({
    ownerEmail: connection.workspaceOwnerEmail,
    calendlyEventUri: payload.event,
    calendlyInviteeUri: payload.invitee,
    startTime,
  });

  await upsertConversationCallEvent({
    ownerEmail: connection.workspaceOwnerEmail,
    id: eventId,
    conversationId,
    eventType: normalizedEventType,
    status,
    title: payload.event_type?.name || "Scheduled Call",
    startTime,
    endTime,
    timezone: payload.timezone || "UTC",
    joinUrl: resolveJoinUrl(payload),
    cancelUrl: payload.cancel_url,
    rescheduleUrl: payload.reschedule_url,
    inviteeName: payload.name,
    inviteeEmail: payload.email,
    calendlyEventUri: payload.event,
    calendlyInviteeUri: payload.invitee,
    rawPayload: parsedRaw,
  });

  await maybeApplyBookedStatus({
    ownerEmail: connection.workspaceOwnerEmail,
    conversationId,
    status,
  });

  return { accepted: true, conversationId };
}

export async function getConversationCalls(input: {
  workspaceOwnerEmail: string;
  conversationId: string;
}) {
  return getConversationCallEvents(
    input.workspaceOwnerEmail,
    input.conversationId,
  );
}

const MAX_CALENDAR_RANGE_DAYS = 93;

function parseCalendarRange(input: { fromIso: string; toIso: string }) {
  const fromIso = input.fromIso.trim();
  const toIso = input.toIso.trim();

  if (!fromIso || !toIso) {
    throw new Error("Invalid calendar range: from and to are required.");
  }

  const from = new Date(fromIso);
  const to = new Date(toIso);

  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
    throw new Error(
      "Invalid calendar range: from and to must be valid ISO datetime values.",
    );
  }
  if (from.getTime() >= to.getTime()) {
    throw new Error("Invalid calendar range: from must be earlier than to.");
  }

  const maxWindowMs = MAX_CALENDAR_RANGE_DAYS * 24 * 60 * 60 * 1000;
  if (to.getTime() - from.getTime() > maxWindowMs) {
    throw new Error(
      `Invalid calendar range: range must be ${MAX_CALENDAR_RANGE_DAYS} days or less.`,
    );
  }

  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
  };
}

export async function getWorkspaceCalendarCalls(input: {
  workspaceOwnerEmail: string;
  fromIso: string;
  toIso: string;
}): Promise<WorkspaceCalendarCallEvent[]> {
  const range = parseCalendarRange({
    fromIso: input.fromIso,
    toIso: input.toIso,
  });

  return getWorkspaceCallEventsByRange({
    ownerEmail: input.workspaceOwnerEmail,
    fromIso: range.fromIso,
    toIso: range.toIso,
  });
}
