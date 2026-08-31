import type { User } from "@/types/inbox";
import type { StatusRole, TagRow } from "@/types/tags";

// Roles where a lead going quiet isn't actionable - either the outcome is
// already decided (won/unqualified/no-show) or it's deliberately parked for
// later (retarget), so it shouldn't be flagged as "cooling". Keyed by role,
// not status name, so renaming "Won" to anything else still excludes it
// correctly - only reassigning the role elsewhere changes what's excluded.
const COOLING_EXCLUDED_ROLES = new Set<StatusRole>([
  "won",
  "unqualified",
  "no_show",
  "retarget",
]);

export const COOLING_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * A lead counts as "cooling" when its status's role isn't excluded above
 * and the lead hasn't sent a message in COOLING_THRESHOLD_MS. A status with
 * no role (a plain custom tag) is treated as active/eligible. Returns false
 * (not true/unknown) when lastInboundAt isn't set yet, since we can't tell
 * how long it's actually been quiet.
 */
export function isLeadCooling(
  user: Pick<User, "status" | "lastInboundAt">,
  statusLookup: Record<string, Pick<TagRow, "role">>,
  now: number = Date.now(),
): boolean {
  const role = statusLookup[user.status]?.role;
  if (role && COOLING_EXCLUDED_ROLES.has(role)) return false;
  if (!user.lastInboundAt) return false;

  const lastInboundMs = new Date(user.lastInboundAt).getTime();
  if (!Number.isFinite(lastInboundMs)) return false;

  return now - lastInboundMs >= COOLING_THRESHOLD_MS;
}
