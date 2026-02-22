import type { DashboardMessageStats, DashboardSnapshot } from '@/types/dashboard';
import type { User } from '@/types/inbox';

interface ConversationSummary {
  qualified: number;
  booked: number;
  closed: number;
  conversionCount: number;
  totalRevenue: number;
  revenueConversations: number;
}

interface MessageSummary {
  linksSent: number;
  incomingConversations: number;
  repliedConversations: number;
  replyPairs: number;
  totalReplyDelayMs: number;
}

function parseRevenueAmount(rawAmount: string | undefined): number | null {
  if (!rawAmount) return null;
  const numeric = Number.parseFloat(rawAmount.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

function summarizeConversations(users: User[]): ConversationSummary {
  let qualified = 0;
  let booked = 0;
  let closed = 0;
  let conversionCount = 0;
  let totalRevenue = 0;
  let revenueConversations = 0;

  for (const user of users) {
    if (user.status === 'Qualified') {
      qualified += 1;
      conversionCount += 1;
    } else if (user.status === 'Booked') {
      booked += 1;
      conversionCount += 1;
    } else if (user.status === 'Won') {
      closed += 1;
      conversionCount += 1;
    }

    const revenueAmount = parseRevenueAmount(user.paymentDetails?.amount);
    if (revenueAmount !== null) {
      totalRevenue += revenueAmount;
      revenueConversations += 1;
    }
  }

  return {
    qualified,
    booked,
    closed,
    conversionCount,
    totalRevenue,
    revenueConversations,
  };
}

function summarizeMessages(
  users: User[],
  messageStatsByConversationId: Map<string, DashboardMessageStats>,
): MessageSummary {
  let linksSent = 0;
  let incomingConversations = 0;
  let repliedConversations = 0;
  let replyPairs = 0;
  let totalReplyDelayMs = 0;

  for (const user of users) {
    const stats = messageStatsByConversationId.get(user.id);
    if (!stats) continue;

    linksSent += stats.linksSentCount;
    replyPairs += stats.replyPairs;
    totalReplyDelayMs += stats.totalReplyDelayMs;

    if (stats.incomingCount > 0) {
      incomingConversations += 1;
      if (stats.outgoingCount > 0) {
        repliedConversations += 1;
      }
    }
  }

  return {
    linksSent,
    incomingConversations,
    repliedConversations,
    replyPairs,
    totalReplyDelayMs,
  };
}

export function createEmptyDashboardSnapshot(
  hasConnectedAccounts: boolean,
): DashboardSnapshot {
  return {
    hasConnectedAccounts,
    metrics: {
      totalRevenue: 0,
      avgReplyTimeMs: null,
      revenuePerCall: 0,
      conversationRate: 0,
      avgReplyRate: null,
    },
    funnel: {
      conversations: 0,
      qualified: 0,
      linksSent: 0,
      booked: 0,
      closed: 0,
    },
  };
}

export function buildDashboardSnapshot(
  users: User[],
  messageStatsByConversationId: Map<string, DashboardMessageStats>,
  hasConnectedAccounts: boolean,
): DashboardSnapshot {
  const snapshot = createEmptyDashboardSnapshot(hasConnectedAccounts);
  if (users.length === 0) {
    return snapshot;
  }

  const conversationSummary = summarizeConversations(users);
  const messageSummary = summarizeMessages(users, messageStatsByConversationId);

  const conversationRate = Math.round(
    (conversationSummary.conversionCount / users.length) * 100,
  );
  const revenuePerCall =
    conversationSummary.revenueConversations > 0
      ? conversationSummary.totalRevenue / conversationSummary.revenueConversations
      : 0;
  const avgReplyTimeMs =
    messageSummary.replyPairs > 0
      ? messageSummary.totalReplyDelayMs / messageSummary.replyPairs
      : null;
  const avgReplyRate =
    messageSummary.incomingConversations > 0
      ? Math.round(
          (messageSummary.repliedConversations /
            messageSummary.incomingConversations) *
            100,
        )
      : null;

  return {
    hasConnectedAccounts,
    metrics: {
      totalRevenue: conversationSummary.totalRevenue,
      avgReplyTimeMs,
      revenuePerCall,
      conversationRate,
      avgReplyRate,
    },
    funnel: {
      conversations: users.length,
      qualified: conversationSummary.qualified,
      linksSent: messageSummary.linksSent,
      booked: conversationSummary.booked,
      closed: conversationSummary.closed,
    },
  };
}
