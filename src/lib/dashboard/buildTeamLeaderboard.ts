import type {
  DashboardMessageStats,
  DashboardTeamMemberSnapshot,
  DashboardTeamRole,
} from "@/types/dashboard";
import type { User } from "@/types/inbox";
import type { StatusRole } from "@/types/tags";

// Someone who should appear on the leaderboard even before they own a lead.
export interface TeamRosterEntry {
  email: string;
  label: string;
  role: DashboardTeamRole;
}

interface MemberTally {
  email: string | null;
  label: string;
  role: DashboardTeamRole | null;
  leads: number;
  incomingConversations: number;
  repliedConversations: number;
  replyPairs: number;
  totalReplyDelayMs: number;
  qualified: number;
  booked: number;
  won: number;
  revenue: number;
}

const UNASSIGNED_KEY = "";
const UNASSIGNED_LABEL = "Unassigned";

// How far along the pipeline each role sits. A won lead was also booked and
// qualified on the way, so it counts towards all three.
const STAGE_DEPTH: Partial<Record<StatusRole, number>> = {
  qualified: 1,
  booked: 2,
  won: 3,
};

function createTally(
  email: string | null,
  label: string,
  role: DashboardTeamRole | null,
): MemberTally {
  return {
    email,
    label,
    role,
    leads: 0,
    incomingConversations: 0,
    repliedConversations: 0,
    replyPairs: 0,
    totalReplyDelayMs: 0,
    qualified: 0,
    booked: 0,
    won: 0,
    revenue: 0,
  };
}

function normalizeEmail(email: string | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

function parseRevenueAmount(rawAmount: string | undefined): number {
  if (!rawAmount) return 0;
  const amount = Number.parseFloat(rawAmount.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function toSnapshot(tally: MemberTally): DashboardTeamMemberSnapshot {
  return {
    email: tally.email,
    label: tally.label,
    role: tally.role,
    leads: tally.leads,
    avgReplyTimeMs:
      tally.replyPairs > 0 ? tally.totalReplyDelayMs / tally.replyPairs : null,
    replyRate:
      tally.incomingConversations > 0
        ? Math.round(
            (tally.repliedConversations / tally.incomingConversations) * 100,
          )
        : null,
    qualified: tally.qualified,
    booked: tally.booked,
    won: tally.won,
    revenue: tally.revenue,
  };
}

// Best results first: money, then how far their leads have got.
function compareMembers(
  a: DashboardTeamMemberSnapshot,
  b: DashboardTeamMemberSnapshot,
): number {
  return (
    b.revenue - a.revenue ||
    b.won - a.won ||
    b.booked - a.booked ||
    b.qualified - a.qualified ||
    b.leads - a.leads ||
    a.label.localeCompare(b.label)
  );
}

// Groups every lead under the person it is assigned to and totals their
// results. Everyone on the roster gets a row; leads nobody owns are collected
// in a final "Unassigned" row.
export function buildTeamLeaderboard(
  users: User[],
  messageStatsByConversationId: Map<string, DashboardMessageStats>,
  roleByStatusName: Record<string, StatusRole | null | undefined>,
  roster: TeamRosterEntry[],
): DashboardTeamMemberSnapshot[] {
  const tallies = new Map<string, MemberTally>();

  for (const entry of roster) {
    const key = normalizeEmail(entry.email);
    if (!key || tallies.has(key)) continue;
    tallies.set(key, createTally(key, entry.label, entry.role));
  }

  for (const user of users) {
    const key = normalizeEmail(user.assignedToEmail);
    let tally = tallies.get(key);
    if (!tally) {
      tally =
        key === UNASSIGNED_KEY
          ? createTally(null, UNASSIGNED_LABEL, null)
          : createTally(key, user.assignedToLabel?.trim() || key, null);
      tallies.set(key, tally);
    }

    tally.leads += 1;
    tally.revenue += parseRevenueAmount(user.paymentDetails?.amount);

    const statusRole = roleByStatusName[user.status];
    const depth = statusRole ? (STAGE_DEPTH[statusRole] ?? 0) : 0;
    if (depth >= 1) tally.qualified += 1;
    if (depth >= 2) tally.booked += 1;
    if (depth >= 3) tally.won += 1;

    const stats = messageStatsByConversationId.get(user.id);
    if (!stats) continue;
    tally.replyPairs += stats.replyPairs;
    tally.totalReplyDelayMs += stats.totalReplyDelayMs;
    if (stats.incomingCount > 0) {
      tally.incomingConversations += 1;
      if (stats.outgoingCount > 0) tally.repliedConversations += 1;
    }
  }

  const unassigned = tallies.get(UNASSIGNED_KEY);
  tallies.delete(UNASSIGNED_KEY);

  const members = Array.from(tallies.values(), toSnapshot).sort(compareMembers);
  return unassigned ? [...members, toSnapshot(unassigned)] : members;
}
