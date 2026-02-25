import { createHash, timingSafeEqual } from "node:crypto";

export type OwnerSignupAccessCodeDecision =
  | { ok: true }
  | { ok: false; reason: "missing_env" | "invalid" };

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function validateOwnerSignupAccessCode(input: string): OwnerSignupAccessCodeDecision {
  const secret = process.env.OWNER_SIGNUP_ACCESS_CODE?.trim();
  if (!secret) {
    return { ok: false, reason: "missing_env" };
  }

  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return { ok: false, reason: "invalid" };
  }

  // Hash to normalize to fixed length, then compare in constant time.
  const isValid = timingSafeEqual(sha256(normalizedInput), sha256(secret));
  return isValid ? { ok: true } : { ok: false, reason: "invalid" };
}

