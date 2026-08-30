import type {
  DashboardMessageStats,
  DashboardSnapshot,
} from "@/types/dashboard";
import type { User } from "@/types/inbox";

interface ConversationSummary {
  newLead: number;
  inContact: number;
  qualified: number;
  booked: number;
  won: number;
  unqualified: number;
  noShow: number;
  conversionCount: number;
  totalRevenue: number;
  revenueConversations: number;
}

interface MessageSummary {
  incomingConversations: number;
  repliedConversations: number;
  replyPairs: number;
  totalReplyDelayMs: number;
}

function parseRevenueAmount(rawAmount: string | undefined): number | null {
  if (!rawAmount) return null;
  const numeric = Number.parseFloat(rawAmount.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

function summarizeConversations(users: User[]): ConversationSummary {
  let newLead = 0;
  let inContact = 0;
  let qualified = 0;
  let booked = 0;
  let won = 0;
  let unqualified = 0;
  let noShow = 0;
  let conversionCount = 0;
  let totalRevenue = 0;
  let revenueConversations = 0;

  for (const user of users) {
    switch (user.status) {
      case "New Lead":
        newLead += 1;
        break;
      case "In-Contact":
        inContact += 1;
        break;
      case "Qualified":
        qualified += 1;
        conversionCount += 1;
        break;
      case "Booked":
        booked += 1;
        conversionCount += 1;
        break;
      case "Won":
        won += 1;
        conversionCount += 1;
        break;
      case "Unqualified":
        unqualified += 1;
        break;
      case "No-Show":
        noShow += 1;
        break;
      default:
        break;
    }

    const revenueAmount = parseRevenueAmount(user.paymentDetails?.amount);
    if (revenueAmount !== null) {
      totalRevenue += revenueAmount;
      revenueConversations += 1;
    }
  }

  return {
    newLead,
    inContact,
    qualified,
    booked,
    won,
    unqualified,
    noShow,
    conversionCount,
    totalRevenue,
    revenueConversations,
  };
}

function summarizeMessages(
  users: User[],
  messageStatsByConversationId: Map<string, DashboardMessageStats>,
): MessageSummary {
  let incomingConversations = 0;
  let repliedConversations = 0;
  let replyPairs = 0;
  let totalReplyDelayMs = 0;

  for (const user of users) {
    const stats = messageStatsByConversationId.get(user.id);
    if (!stats) continue;

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
      newLead: 0,
      inContact: 0,
      qualified: 0,
      booked: 0,
      won: 0,
      unqualified: 0,
      noShow: 0,
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
      ? conversationSummary.totalRevenue /
        conversationSummary.revenueConversations
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
      newLead: conversationSummary.newLead,
      inContact: conversationSummary.inContact,
      qualified: conversationSummary.qualified,
      booked: conversationSummary.booked,
      won: conversationSummary.won,
      unqualified: conversationSummary.unqualified,
      noShow: conversationSummary.noShow,
    },
  };
}
