const BASE_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  "object-src": ["'none'"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'", "data:"],
  "connect-src": [
    "'self'",
    "https://graph.facebook.com",
    "https://www.facebook.com",
    "https://integrate.api.nvidia.com",
  ],
};

export interface ContentSecurityPolicyOptions {
  isDevelopment: boolean;
}

function formatDirective(name: string, values: string[]): string {
  return `${name} ${values.join(" ")}`;
}

export function buildContentSecurityPolicy({
  isDevelopment,
}: ContentSecurityPolicyOptions): string {
  const directives: Record<string, string[]> = {
    ...BASE_DIRECTIVES,
    "script-src": isDevelopment
      ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
      : ["'self'", "'unsafe-inline'"],
    "style-src": ["'self'", "'unsafe-inline'"],
  };

  if (isDevelopment) {
    directives["connect-src"] = [...BASE_DIRECTIVES["connect-src"], "ws:", "wss:"];
  }

  return Object.entries(directives)
    .map(([name, values]) => formatDirective(name, values))
    .join("; ");
}
