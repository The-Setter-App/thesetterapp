const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// RFC 5321 caps a full address at 254 characters.
const MAX_EMAIL_LENGTH = 254;

/**
 * Trims and lowercases a raw email, returning null when it isn't a usable
 * address. Shared by the form (inline validation) and the API route, so both
 * sides agree on what counts as valid and on the stored form.
 */
export function normalizeWaitlistEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const normalized = raw.trim().toLowerCase();
  if (!normalized || normalized.length > MAX_EMAIL_LENGTH) return null;

  return EMAIL_REGEX.test(normalized) ? normalized : null;
}
