import type {
  CalendlyCreateWebhookSubscriptionResult,
  CalendlyWebhookEventPayload,
} from "@/types/calendly";

const DEFAULT_BASE_URL = "https://api.calendly.com";

interface CalendlyApiCurrentUserResponse {
  resource?: {
    uri?: string;
    current_organization?: string;
    scheduling_url?: string;
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
  required_scopes?: string[];
  details?: Array<{ message?: string }>;
}

async function readCalendlyError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as CalendlyApiErrorResponse;
    const details = Array.isArray(data.details)
      ? data.details
          .map((detail) => detail.message)
          .filter(Boolean)
          .join("; ")
      : "";
    const requiredScopes = Array.isArray(data.required_scopes)
      ? data.required_scopes.filter(Boolean).join(", ")
      : "";
    const base = data.message || data.title || `HTTP ${response.status}`;
    const metadata = [details, requiredScopes ? `required_scopes=${requiredScopes}` : ""]
      .filter(Boolean)
      .join(" | ");
    return metadata ? `${base} (${metadata})` : base;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function getCalendlyBaseUrl(): string {
  return process.env.CALENDLY_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

function getAuthHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export function parseCalendlyWebhookBody(
  body: unknown,
): CalendlyWebhookEventPayload {
  if (typeof body !== "object" || body === null) return {};
  return body as CalendlyWebhookEventPayload;
}

export async function getCalendlyCurrentUser(accessToken: string): Promise<{
  userUri: string;
  organizationUri: string;
  schedulingUrl?: string;
}> {
  const base = getCalendlyBaseUrl();
  const response = await fetch(`${base}/users/me`, {
    method: "GET",
    headers: getAuthHeaders(accessToken),
    cache: "no-store",
  });
  if (!response.ok) {
    const reason = await readCalendlyError(response);
    throw new Error(`Failed to resolve Calendly current user: ${reason}`);
  }

  const data = (await response.json()) as CalendlyApiCurrentUserResponse;
  const userUri = data.resource?.uri?.trim();
  const organizationUri = data.resource?.current_organization?.trim();
  if (!organizationUri || !userUri) {
    throw new Error("Calendly organization could not be resolved.");
  }
  return {
    userUri,
    organizationUri,
    schedulingUrl: data.resource?.scheduling_url?.trim() || undefined,
  };
}

export async function createCalendlyWebhookSubscription(input: {
  accessToken: string;
  organizationUri: string;
  webhookUrl: string;
  signingKey: string;
}): Promise<CalendlyCreateWebhookSubscriptionResult> {
  const base = getCalendlyBaseUrl();
  const response = await fetch(`${base}/webhook_subscriptions`, {
    method: "POST",
    headers: getAuthHeaders(input.accessToken),
    body: JSON.stringify({
      url: input.webhookUrl,
      events: ["invitee.created", "invitee.canceled"],
      organization: input.organizationUri,
      scope: "organization",
      signing_key: input.signingKey,
    }),
  });

  if (!response.ok) {
    const reason = await readCalendlyError(response);
    throw new Error(
      `Failed to register Calendly webhook subscription: ${reason}`,
    );
  }

  const data = (await response.json()) as CalendlyApiCreateWebhookResponse;
  const resourceUri = data.resource?.uri?.trim();
  if (!resourceUri) {
    throw new Error("Calendly webhook subscription response was invalid.");
  }
  return { resourceUri };
}

export async function deleteCalendlyWebhookSubscription(input: {
  accessToken: string;
  webhookSubscriptionUri?: string | null;
}): Promise<void> {
  const uri = input.webhookSubscriptionUri?.trim();
  if (!uri) return;
  try {
    const response = await fetch(uri, {
      method: "DELETE",
      headers: getAuthHeaders(input.accessToken),
    });
    if (!response.ok && response.status !== 404) {
      console.warn(
        `[CalendlyClient] Failed to delete webhook subscription (${response.status}).`,
      );
    }
  } catch (error) {
    console.warn(
      "[CalendlyClient] Failed to delete webhook subscription.",
      error,
    );
  }
}
