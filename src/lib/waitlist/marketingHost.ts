// The marketing domain serves the waitlist at its root, while the product
// itself lives on the app domain (APP_URL). Both point at this deployment, so
// the host header decides which one a request is for.
const DEFAULT_MARKETING_HOSTS = ["thesetter.app", "www.thesetter.app"];

export const MARKETING_HOME_PATH = "/waitlist";

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

function getMarketingHosts(): string[] {
  const configured = process.env.MARKETING_HOSTS?.split(",")
    .map(normalizeHost)
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_MARKETING_HOSTS;
}

export function isMarketingHost(host: string | null): boolean {
  if (!host) return false;
  return getMarketingHosts().includes(normalizeHost(host));
}

// Origin of the product app, used to send app routes that were requested on
// the marketing domain to the host where sessions and OAuth callbacks live.
// Returns null when APP_URL is missing, malformed, or is itself a marketing
// host, so a misconfiguration can never cause a redirect loop.
export function getAppOrigin(): string | null {
  const raw = process.env.APP_URL?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    return isMarketingHost(url.host) ? null : url.origin;
  } catch {
    return null;
  }
}
