import { formatCompactDuration } from "@/lib/inbox/duration";
import { MESSAGING_WINDOW_MS } from "@/lib/inbox/messagingWindow";
import type { User } from "@/types/inbox";
import type { StatusRole, TagRow } from "@/types/tags";

// What the team owes a lead right now:
// - "awaiting_reply": the lead spoke last and nobody has answered.
// - "check_in": the team spoke last and the lead has gone quiet.
export type FollowUpKind = "awaiting_reply" | "check_in";

export interface FollowUpTask {
  kind: FollowUpKind;
  // How long the clock has been running: since the lead's message for a
  // reply, since the team's last message for a check-in. Null when the
  // conversation carries no usable time.
  elapsedMs: number | null;
  // True once it has run long enough to stand out in the list.
  overdue: boolean;
}

type FollowUpLead = Pick<
  User,
  "needsReply" | "unread" | "lastInboundAt" | "updatedAt" | "status"
>;

// Roles where a quiet lead needs no nudge: the outcome is decided (won,
// unqualified, no-show) or the lead is deliberately parked (retarget). Keyed
// by role, not status name, so renaming "Won" still excludes it.
const NO_CHECK_IN_ROLES = new Set<StatusRole>([
  "won",
  "unqualified",
  "no_show",
  "retarget",
]);

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// A lead left waiting this long is losing interest.
export const REPLY_OVERDUE_AFTER_MS = HOUR_MS;
// How long a lead may stay quiet after the team's last message before a
// check-in is due, and when that check-in becomes pressing.
export const CHECK_IN_AFTER_MS = DAY_MS;
export const CHECK_IN_OVERDUE_AFTER_MS = 3 * DAY_MS;

function toTimestampMs(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function elapsedSince(timestampMs: number | null, now: number): number | null {
  return timestampMs === null ? null : Math.max(0, now - timestampMs);
}

// The follow-up a conversation needs, or null when nothing is owed.
export function getFollowUpTask(
  user: FollowUpLead,
  statusLookup: Record<string, Pick<TagRow, "role">>,
  now: number = Date.now(),
): FollowUpTask | null {
  const lastInboundMs = toTimestampMs(user.lastInboundAt);
  // Every message, in either direction, moves this forward.
  const lastActivityMs = toTimestampMs(user.updatedAt);

  // Past the messaging window Instagram refuses the message, so there is
  // nothing the team can send, whoever spoke last.
  const windowOpenedMs = lastInboundMs ?? lastActivityMs;
  if (windowOpenedMs !== null && now - windowOpenedMs >= MESSAGING_WINDOW_MS) {
    return null;
  }

  if (user.needsReply || (user.unread ?? 0) > 0) {
    // Older conversations have no recorded inbound time; their last activity
    // is the lead's message, since the lead spoke last.
    const elapsedMs = elapsedSince(lastInboundMs ?? lastActivityMs, now);
    return {
      kind: "awaiting_reply",
      elapsedMs,
      overdue: elapsedMs !== null && elapsedMs >= REPLY_OVERDUE_AFTER_MS,
    };
  }

  const role = statusLookup[user.status]?.role;
  if (role && NO_CHECK_IN_ROLES.has(role)) return null;

  const quietMs = elapsedSince(lastActivityMs, now);
  if (quietMs === null || quietMs < CHECK_IN_AFTER_MS) return null;

  return {
    kind: "check_in",
    elapsedMs: quietMs,
    overdue: quietMs >= CHECK_IN_OVERDUE_AFTER_MS,
  };
}

// Order for the to-do list: unanswered leads first, then check-ins, and
// within each the one that has waited longest on top.
export function compareFollowUpTasks(a: FollowUpTask, b: FollowUpTask): number {
  if (a.kind !== b.kind) return a.kind === "awaiting_reply" ? -1 : 1;
  return (b.elapsedMs ?? -1) - (a.elapsedMs ?? -1);
}

// The words shown on a conversation for its task.
export function formatFollowUpLabel(task: FollowUpTask): string {
  if (task.kind === "awaiting_reply") {
    return task.elapsedMs === null
      ? "Needs a reply"
      : `Waiting ${formatCompactDuration(task.elapsedMs)}`;
  }
  return task.elapsedMs === null
    ? "Follow up"
    : `Follow up · quiet ${formatCompactDuration(task.elapsedMs)}`;
}

export function describeFollowUpTask(task: FollowUpTask): string {
  return task.kind === "awaiting_reply"
    ? "This lead is waiting on a reply."
    : "You spoke last and this lead has gone quiet.";
}
