const DEFAULT_OAUTH_BASE_URL = "https://auth.calendly.com";
const DEFAULT_OAUTH_SCOPES = [
  "users:read",
  "webhooks:write",
  "scheduled_events:read",
];

interface CalendlyOAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number | string;
}

interface CalendlyOAuthErrorResponse {
  error?: string;
  error_description?: string;
  message?: string;
}

export interface CalendlyOAuthTokenSet {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  scope?: string;
  expiresInSeconds: number;
}

interface CalendlyOAuthConfig {
  clientId: string;
  clientSecret: string;
  oauthBaseUrl: string;
  oauthScopes: string[];
}

function getCalendlyOAuthConfig(): CalendlyOAuthConfig {
  const clientId = process.env.CALENDLY_OAUTH_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.CALENDLY_OAUTH_CLIENT_SECRET?.trim() || "";
  const oauthBaseUrl =
    process.env.CALENDLY_OAUTH_BASE_URL?.trim() || DEFAULT_OAUTH_BASE_URL;

  if (!clientId) {
    throw new Error("CALENDLY_OAUTH_CLIENT_ID must be configured.");
  }
  if (!clientSecret) {
    throw new Error("CALENDLY_OAUTH_CLIENT_SECRET must be configured.");
  }
  const oauthScopesRaw = process.env.CALENDLY_OAUTH_SCOPES?.trim();
  const oauthScopes = oauthScopesRaw
    ? oauthScopesRaw
        .split(/[,\s]+/)
        .map((scope) => scope.trim())
        .filter(Boolean)
    : DEFAULT_OAUTH_SCOPES;

  return {
    clientId,
    clientSecret,
    oauthBaseUrl: oauthBaseUrl.replace(/\/+$/g, ""),
    oauthScopes,
  };
}

function toBasicAuthorizationHeader(input: {
  clientId: string;
  clientSecret: string;
}): string {
  const encoded = Buffer.from(
    `${input.clientId}:${input.clientSecret}`,
    "utf8",
  ).toString("base64");
  return `Basic ${encoded}`;
}

function parseExpiresIn(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  throw new Error(
    "Calendly OAuth token response is missing a valid expires_in.",
  );
}

function parseTokenResponse(
  payload: CalendlyOAuthTokenResponse,
): CalendlyOAuthTokenSet {
  const accessToken = payload.access_token?.trim() || "";
  const refreshToken = payload.refresh_token?.trim() || "";
  const tokenType = payload.token_type?.trim() || "Bearer";
  const expiresInSeconds = parseExpiresIn(payload.expires_in);

  if (!accessToken || !refreshToken) {
    throw new Error("Calendly OAuth token response is missing credentials.");
  }

  return {
    accessToken,
    refreshToken,
    tokenType,
    scope: payload.scope?.trim() || undefined,
    expiresInSeconds,
  };
}

async function readOAuthError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as CalendlyOAuthErrorResponse;
    return (
      payload.error_description ||
      payload.message ||
      payload.error ||
      `HTTP ${response.status}`
    );
  } catch {
    return `HTTP ${response.status}`;
  }
}

export function resolveCalendlyOAuthRedirectUri(origin?: string): string {
  const appUrl = process.env.APP_URL?.trim() || origin?.trim() || "";
  if (!appUrl) {
    throw new Error("APP_URL must be configured for Calendly OAuth.");
  }
  return `${appUrl.replace(/\/+$/g, "")}/api/auth/calendly/callback`;
}

export function buildCalendlyOAuthAuthorizeUrl(input: {
  state: string;
  redirectUri: string;
}): string {
  const state = input.state.trim();
  if (!state) {
    throw new Error("OAuth state is required.");
  }

  const { clientId, oauthBaseUrl, oauthScopes } = getCalendlyOAuthConfig();
  const url = new URL(`${oauthBaseUrl}/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", oauthScopes.join(" "));
  return url.toString();
}

export async function exchangeCalendlyOAuthCode(input: {
  code: string;
  redirectUri: string;
}): Promise<CalendlyOAuthTokenSet> {
  const code = input.code.trim();
  if (!code) {
    throw new Error("OAuth authorization code is required.");
  }

  const { clientId, clientSecret, oauthBaseUrl } = getCalendlyOAuthConfig();
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", input.redirectUri);

  const response = await fetch(`${oauthBaseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: toBasicAuthorizationHeader({ clientId, clientSecret }),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const reason = await readOAuthError(response);
    throw new Error(`Failed to exchange Calendly OAuth code: ${reason}`);
  }

  const payload = (await response.json()) as CalendlyOAuthTokenResponse;
  return parseTokenResponse(payload);
}

export async function refreshCalendlyOAuthToken(input: {
  refreshToken: string;
}): Promise<CalendlyOAuthTokenSet> {
  const refreshToken = input.refreshToken.trim();
  if (!refreshToken) {
    throw new Error("Calendly refresh token is required.");
  }

  const { clientId, clientSecret, oauthBaseUrl } = getCalendlyOAuthConfig();
  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refreshToken);

  const response = await fetch(`${oauthBaseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: toBasicAuthorizationHeader({ clientId, clientSecret }),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const reason = await readOAuthError(response);
    throw new Error(`Failed to refresh Calendly OAuth token: ${reason}`);
  }

  const payload = (await response.json()) as CalendlyOAuthTokenResponse;
  return parseTokenResponse(payload);
}

export function toOAuthAccessTokenExpiresAtIso(
  expiresInSeconds: number,
): string {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}
