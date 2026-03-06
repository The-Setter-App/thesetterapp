import { createHmac } from "node:crypto";

function getTrackingSecret(): string {
  const value = process.env.CALENDLY_TRACKING_SECRET?.trim() || "";
  if (value.length < 32) {
    throw new Error(
      "CALENDLY_TRACKING_SECRET must be set and at least 32 characters.",
    );
  }
  return value;
}

function _toBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string): string {
  const padded = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function signPayload(encodedPayload: string): string {
  const secret = getTrackingSecret();
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

export function buildConversationTrackingHash(input: {
  conversationId: string;
  workspaceOwnerEmail: string;
}): string {
  const basis = `${input.workspaceOwnerEmail.toLowerCase()}|${input.conversationId}`;
  const digest = createHmac("sha256", getTrackingSecret())
    .update(basis)
    .digest("base64url");
  return digest.slice(0, 16);
}

export function buildTrackingToken(input: {
  conversationId: string;
  workspaceOwnerEmail: string;
  ttlHours?: number;
}): string {
  const now = Date.now();
  const ttlHours = Number.isFinite(input.ttlHours)
    ? Number(input.ttlHours)
    : 24 * 14;
  const exp = now + ttlHours * 60 * 60 * 1000;
  const hash = buildConversationTrackingHash(input);
  const payload = `${hash}.${exp}`;
  const signature = signPayload(payload).slice(0, 22);
  return `v2.${hash}.${exp}.${signature}`;
}

export function parseTrackingToken(
  token: string | null | undefined,
): { conversationHash: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length === 4 && parts[0] === "v2") {
    const hash = parts[1];
    const expRaw = parts[2];
    const signature = parts[3];
    if (!hash || !expRaw || !signature) return null;
    const exp = Number.parseInt(expRaw, 10);
    if (!Number.isFinite(exp) || exp < Date.now()) return null;
    const expected = signPayload(`${hash}.${exp}`).slice(0, 22);
    if (signature !== expected) return null;
    return { conversationHash: hash };
  }

  // Backward compatibility with old oversized format.
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;
  const expected = signPayload(encodedPayload);
  if (signature !== expected) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as {
      c?: string;
      o?: string;
      exp?: number;
    };
    if (!parsed?.c || !parsed?.o || !parsed?.exp) return null;
    if (parsed.exp < Date.now()) return null;
    return {
      conversationHash: buildConversationTrackingHash({
        conversationId: parsed.c,
        workspaceOwnerEmail: parsed.o,
      }),
    };
  } catch {
    return null;
  }
}
