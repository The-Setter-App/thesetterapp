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
  conversations: number;
  qualified: number;
  linksSent: number;
  booked: number;
  closed: number;
}

export interface DashboardSnapshot {
  hasConnectedAccounts: boolean;
  metrics: DashboardMetricSnapshot;
  funnel: DashboardFunnelSnapshot;
}
