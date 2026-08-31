import type { User } from "@/types/inbox";

// Statuses where a lead going quiet isn't actionable - either the outcome
// is already decided (Won/Unqualified/No-Show) or it's deliberately parked
// for later (Retarget), so it shouldn't be flagged as "cooling".
const COOLING_EXCLUDED_STATUSES = new Set([
  "Won",
  "Unqualified",
  "No-Show",
  "Retarget",
]);

export const COOLING_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * A lead counts as "cooling" when it's in an active status (not a custom
 * workspace status excluded above) and the lead hasn't sent a message in
 * COOLING_THRESHOLD_MS. Returns false (not true/unknown) when lastInboundAt
 * isn't set yet, since we can't tell how long it's actually been quiet.
 */
export function isLeadCooling(
  user: Pick<User, "status" | "lastInboundAt">,
  now: number = Date.now(),
): boolean {
  if (COOLING_EXCLUDED_STATUSES.has(user.status)) return false;
  if (!user.lastInboundAt) return false;

  const lastInboundMs = new Date(user.lastInboundAt).getTime();
  if (!Number.isFinite(lastInboundMs)) return false;

  return now - lastInboundMs >= COOLING_THRESHOLD_MS;
}
