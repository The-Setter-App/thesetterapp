import {
  createCalendlyWebhookSubscription,
  deleteCalendlyWebhookSubscription,
  getCalendlyCurrentUser,
} from "@/lib/calendly/client";
import {
  exchangeCalendlyOAuthCode,
  toOAuthAccessTokenExpiresAtIso,
} from "@/lib/calendly/oauth";
import {
  createCalendlyInvite,
  disconnectCalendlyConnection,
  generateInviteId,
  generateWebhookSigningKey,
  getCalendlyConnectionByOwnerEmail,
  getCalendlyConnectionSecretByOwnerEmail,
  updateCalendlyConnectionSchedulingUrl,
  upsertCalendlyConnection,
} from "@/lib/calendly/repository";
import { buildTrackingToken } from "@/lib/calendly/tracking";
import {
  buildCalendlyWebhookUrl,
  deletePreviousWebhookIfPresent,
  ensureFreshConnectionSecret,
  normalizeCalendlyUrl,
  toCalendlyConnectionUpsertInput,
  toMaskedOauthCredential,
} from "./service.shared";

export async function connectCalendlyForWorkspaceOAuth(input: {
  workspaceOwnerEmail: string;
  authorizationCode: string;
  redirectUri: string;
}) {
  const tokenSet = await exchangeCalendlyOAuthCode({
    code: input.authorizationCode,
    redirectUri: input.redirectUri,
  });
  const currentUser = await getCalendlyCurrentUser(tokenSet.accessToken);
  if (!currentUser.schedulingUrl) {
    throw new Error(
      "Calendly account did not provide a default scheduling URL.",
    );
  }
  const schedulingUrl = normalizeCalendlyUrl(currentUser.schedulingUrl);
  const previous = await getCalendlyConnectionSecretByOwnerEmail(
    input.workspaceOwnerEmail,
  );
  const webhookSigningKey = generateWebhookSigningKey();
  const oauthAccessTokenExpiresAt = toOAuthAccessTokenExpiresAtIso(
    tokenSet.expiresInSeconds,
  );

  const provisional = await upsertCalendlyConnection({
    ...toCalendlyConnectionUpsertInput({
      workspaceOwnerEmail: input.workspaceOwnerEmail,
      tokenSet,
      oauthAccessTokenExpiresAt,
      user: {
        userUri: currentUser.userUri,
        organizationUri: currentUser.organizationUri,
      },
      schedulingUrl,
      webhookSigningKey,
    }),
  });

  try {
    const webhookUrl = buildCalendlyWebhookUrl(provisional.id);
    const webhook = await createCalendlyWebhookSubscription({
      accessToken: tokenSet.accessToken,
      organizationUri: currentUser.organizationUri,
      webhookUrl,
      signingKey: webhookSigningKey,
    });

    const updated = await upsertCalendlyConnection({
      ...toCalendlyConnectionUpsertInput({
        workspaceOwnerEmail: input.workspaceOwnerEmail,
        tokenSet,
        oauthAccessTokenExpiresAt,
        user: {
          userUri: currentUser.userUri,
          organizationUri: currentUser.organizationUri,
        },
        schedulingUrl,
        webhookSigningKey,
        webhookSubscriptionUri: webhook.resourceUri,
      }),
    });

    await deletePreviousWebhookIfPresent(previous);
    return updated;
  } catch (error) {
    await disconnectCalendlyConnection(input.workspaceOwnerEmail);
    throw error;
  }
}

export async function disconnectCalendlyForWorkspace(
  workspaceOwnerEmail: string,
) {
  const existing =
    await getCalendlyConnectionSecretByOwnerEmail(workspaceOwnerEmail);
  if (existing) {
    const freshSecret = await ensureFreshConnectionSecret(existing);
    await deleteCalendlyWebhookSubscription({
      accessToken: freshSecret.oauthAccessToken,
      webhookSubscriptionUri: freshSecret.webhookSubscriptionUri,
    });
  }
  await disconnectCalendlyConnection(workspaceOwnerEmail);
}

export async function getCalendlyConnectionState(workspaceOwnerEmail: string) {
  return getCalendlyConnectionByOwnerEmail(workspaceOwnerEmail);
}

export async function getCalendlyConnectionSettingsState(
  workspaceOwnerEmail: string,
) {
  const connection =
    await getCalendlyConnectionByOwnerEmail(workspaceOwnerEmail);
  if (!connection) return { connected: false as const };

  const secret =
    await getCalendlyConnectionSecretByOwnerEmail(workspaceOwnerEmail);
  const credentialPreview = secret
    ? toMaskedOauthCredential(secret.oauthAccessToken)
    : "OAuth ********";

  return {
    connected: true as const,
    connectedAt: connection.connectedAt,
    schedulingUrl: connection.schedulingUrl,
    credentialPreview,
  };
}

export async function updateCalendlySchedulingUrlForWorkspace(
  workspaceOwnerEmail: string,
  input: { schedulingUrl: string },
) {
  const schedulingUrl = normalizeCalendlyUrl(input.schedulingUrl);
  const updated = await updateCalendlyConnectionSchedulingUrl({
    workspaceOwnerEmail,
    schedulingUrl,
  });
  if (!updated) {
    throw new Error("Calendly is not connected.");
  }

  const secret =
    await getCalendlyConnectionSecretByOwnerEmail(workspaceOwnerEmail);
  const credentialPreview = secret
    ? toMaskedOauthCredential(secret.oauthAccessToken)
    : "OAuth ********";

  return {
    connected: true as const,
    connectedAt: updated.connectedAt,
    schedulingUrl: updated.schedulingUrl,
    credentialPreview,
  };
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
