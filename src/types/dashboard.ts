export interface DashboardMessageStats {
  conversationId: string;
  incomingCount: number;
  outgoingCount: number;
  linksSentCount: number;
  replyPairs: number;
  totalReplyDelayMs: number;
}

export interface DashboardMetricSnapshot {
  totalRevenue: number;
  avgReplyTimeMs: number | null;
  revenuePerCall: number;
  conversationRate: number;
  avgReplyRate: number | null;
}

export interface DashboardFunnelSnapshot {
  newLead: number;
  inContact: number;
  qualified: number;
  booked: number;
  won: number;
  unqualified: number;
  noShow: number;
}

export type DashboardTeamRole = "owner" | "setter" | "closer";

// One person's numbers on the team leaderboard. A lead counts towards
// whoever it is assigned to.
export interface DashboardTeamMemberSnapshot {
  // Null for the row that collects leads nobody owns yet.
  email: string | null;
  label: string;
  // Null for someone who owns leads but is no longer on the team.
  role: DashboardTeamRole | null;
  leads: number;
  avgReplyTimeMs: number | null;
  // Share of their leads that got an answer, 0 to 100.
  replyRate: number | null;
  // Leads that reached each stage or went beyond it.
  qualified: number;
  booked: number;
  won: number;
  revenue: number;
}

export interface DashboardSnapshot {
  hasConnectedAccounts: boolean;
  metrics: DashboardMetricSnapshot;
  funnel: DashboardFunnelSnapshot;
  team: DashboardTeamMemberSnapshot[];
}
