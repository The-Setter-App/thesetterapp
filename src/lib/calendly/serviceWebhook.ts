import { parseCalendlyWebhookBody } from "@/lib/calendly/client";
import {
  buildCallEventId,
  consumeCalendlyInviteIfUnused,
  findConversationIdByContactEmail,
  findConversationIdByTrackingHash,
  findConversationIdByTrackingTokenPrefix,
  getCalendlyConnectionSecretById,
  getCalendlyInvite,
  upsertConversationCallEvent,
} from "@/lib/calendly/repository";
import { parseTrackingToken } from "@/lib/calendly/tracking";
import { emitWorkspaceSseEvent } from "@/lib/inbox/sseBus";
import {
  isRescheduledCreatedEvent,
  maybeApplyBookedStatus,
  maybeFetchCalendlyPreCallAnswers,
  resolveCallStatus,
  resolveCallTitle,
  resolveInviteeUri,
  resolveJoinUrl,
  resolveScheduledWindow,
  resolveWebhookPreCallAnswers,
  verifyWebhookSignature,
} from "./service.shared";

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
  const inviteeUri = resolveInviteeUri(payload);
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

  const scheduledWindow = resolveScheduledWindow({
    payload,
    webhookCreatedAt: body.created_at,
  });
  const eventId = buildCallEventId({
    ownerEmail: connection.workspaceOwnerEmail,
    calendlyEventUri: payload.event,
    calendlyInviteeUri: inviteeUri,
    startTime: scheduledWindow.startTime,
  });
  const webhookPreCallAnswers = resolveWebhookPreCallAnswers(payload);

  await upsertConversationCallEvent({
    ownerEmail: connection.workspaceOwnerEmail,
    id: eventId,
    conversationId,
    eventType: normalizedEventType,
    status,
    title: resolveCallTitle(payload),
    startTime: scheduledWindow.startTime,
    endTime: scheduledWindow.endTime,
    timezone: scheduledWindow.timezone,
    joinUrl: resolveJoinUrl(payload),
    cancelUrl: payload.cancel_url,
    rescheduleUrl: payload.reschedule_url,
    inviteeName: payload.name,
    inviteeEmail: payload.email,
    calendlyEventUri: payload.event,
    calendlyInviteeUri: inviteeUri,
    preCallAnswers:
      webhookPreCallAnswers ??
      (await maybeFetchCalendlyPreCallAnswers({
        ownerEmail: connection.workspaceOwnerEmail,
        inviteeUri,
      }).catch((error) => {
        console.warn(
          "[CalendlyService] Failed to fetch pre-call answers during webhook sync.",
          error,
        );
        return undefined;
      })),
    rawPayload: parsedRaw,
  });

  await maybeApplyBookedStatus({
    ownerEmail: connection.workspaceOwnerEmail,
    conversationId,
    status,
  });

  if (conversationId) {
    emitWorkspaceSseEvent(connection.workspaceOwnerEmail, {
      type: "calendly_call_updated",
      timestamp: new Date().toISOString(),
      data: { conversationId, callId: eventId },
    });
  }

  return { accepted: true, conversationId };
}
