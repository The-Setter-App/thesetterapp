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

export interface DashboardSnapshot {
  hasConnectedAccounts: boolean;
  metrics: DashboardMetricSnapshot;
  funnel: DashboardFunnelSnapshot;
}
