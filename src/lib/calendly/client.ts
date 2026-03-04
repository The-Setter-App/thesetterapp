import type {
  CalendlyCreateWebhookSubscriptionResult,
  CalendlyWebhookEventPayload,
} from "@/types/calendly";

const DEFAULT_BASE_URL = "https://api.calendly.com";

interface CalendlyApiCurrentUserResponse {
  resource?: {
    uri?: string;
    current_organization?: string;
  };
}

interface CalendlyApiCreateWebhookResponse {
  resource?: {
    uri?: string;
  };
}

interface CalendlyApiErrorResponse {
  title?: string;
  message?: string;
  details?: Array<{ message?: string }>;
}

async function readCalendlyError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as CalendlyApiErrorResponse;
    const details = Array.isArray(data.details)
      ? data.details.map((detail) => detail.message).filter(Boolean).join("; ")
      : "";
    const base = data.message || data.title || `HTTP ${response.status}`;
    return details ? `${base} (${details})` : base;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function getCalendlyBaseUrl(): string {
  return process.env.CALENDLY_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

function getAuthHeaders(personalAccessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${personalAccessToken}`,
    "Content-Type": "application/json",
  };
}

export function parseCalendlyWebhookBody(body: unknown): CalendlyWebhookEventPayload {
  if (typeof body !== "object" || body === null) return {};
  return body as CalendlyWebhookEventPayload;
}

export async function validateCalendlyTokenAndGetOrganization(
  personalAccessToken: string,
): Promise<{ organizationUri: string }> {
  const base = getCalendlyBaseUrl();
  const response = await fetch(`${base}/users/me`, {
    method: "GET",
    headers: getAuthHeaders(personalAccessToken),
    cache: "no-store",
  });
  if (!response.ok) {
    const reason = await readCalendlyError(response);
    throw new Error(`Invalid Calendly token: ${reason}`);
  }

  const data = (await response.json()) as CalendlyApiCurrentUserResponse;
  const organizationUri = data.resource?.current_organization?.trim();
  if (!organizationUri) {
    throw new Error("Calendly organization could not be resolved.");
  }
  return { organizationUri };
}

export async function createCalendlyWebhookSubscription(input: {
  personalAccessToken: string;
  webhookUrl: string;
  signingKey: string;
}): Promise<CalendlyCreateWebhookSubscriptionResult> {
  const { organizationUri } = await validateCalendlyTokenAndGetOrganization(
    input.personalAccessToken,
  );

  const base = getCalendlyBaseUrl();
  const response = await fetch(`${base}/webhook_subscriptions`, {
    method: "POST",
    headers: getAuthHeaders(input.personalAccessToken),
    body: JSON.stringify({
      url: input.webhookUrl,
      events: ["invitee.created", "invitee.canceled"],
      organization: organizationUri,
      scope: "organization",
      signing_key: input.signingKey,
    }),
  });

  if (!response.ok) {
    const reason = await readCalendlyError(response);
    throw new Error(`Failed to register Calendly webhook subscription: ${reason}`);
  }

  const data = (await response.json()) as CalendlyApiCreateWebhookResponse;
  const resourceUri = data.resource?.uri?.trim();
  if (!resourceUri) {
    throw new Error("Calendly webhook subscription response was invalid.");
  }
  return { resourceUri };
}

export async function deleteCalendlyWebhookSubscription(input: {
  personalAccessToken: string;
  webhookSubscriptionUri?: string | null;
}): Promise<void> {
  const uri = input.webhookSubscriptionUri?.trim();
  if (!uri) return;
  try {
    const response = await fetch(uri, {
      method: "DELETE",
      headers: getAuthHeaders(input.personalAccessToken),
    });
    if (!response.ok && response.status !== 404) {
      console.warn(
        `[CalendlyClient] Failed to delete webhook subscription (${response.status}).`,
      );
    }
  } catch (error) {
    console.warn("[CalendlyClient] Failed to delete webhook subscription.", error);
  }
}
