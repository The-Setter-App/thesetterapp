import { createHmac } from "node:crypto";
import {
  countWaitlistSignupsSince,
  insertWaitlistSignup,
} from "@/lib/waitlist/waitlistRepository";

const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const MAX_SIGNUPS_PER_WINDOW = 5;
const MIN_SECRET_LENGTH = 16;

export type JoinWaitlistResult =
  | { status: "joined" }
  | { status: "rate_limited"; retryAfterSeconds: number };

function getIpHashSecret(): string {
  const secret = process.env.ENCRYPTION_KEY?.trim() ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error("ENCRYPTION_KEY is not configured");
  }
  return secret;
}

function hashClientIp(clientIp: string): string {
  return createHmac("sha256", getIpHashSecret())
    .update(`waitlist:${clientIp}`)
    .digest("hex");
}

/**
 * Adds an email to the waitlist. A repeat signup for the same email reports
 * "joined" too, so the response never reveals whether an address was already
 * on the list. The per-source cap counts stored rows, so repeats don't use it
 * up; it only limits how many new addresses one source can add per hour.
 */
export async function joinWaitlist(input: {
  email: string;
  clientIp: string;
}): Promise<JoinWaitlistResult> {
  const ipHash = hashClientIp(input.clientIp);
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000);

  const recentSignups = await countWaitlistSignupsSince({
    ipHash,
    sinceIso: windowStart.toISOString(),
  });
  if (recentSignups >= MAX_SIGNUPS_PER_WINDOW) {
    return {
      status: "rate_limited",
      retryAfterSeconds: RATE_LIMIT_WINDOW_SECONDS,
    };
  }

  await insertWaitlistSignup({ email: input.email, ipHash });
  return { status: "joined" };
}
