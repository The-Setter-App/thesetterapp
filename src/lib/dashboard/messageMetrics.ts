import { getInboxSupabase } from "@/lib/inbox/repository/core";
import type { DashboardMessageStats } from "@/types/dashboard";

const CONVERSATION_QUERY_CHUNK_SIZE = 250;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/i;

type DashboardMessageDoc = {
  id: string;
  conversationId: string;
  ownerEmail: string;
  fromMe?: boolean;
  text?: string;
  timestamp?: string;
  isEmpty?: boolean;
};

interface MutableDashboardMessageStats extends DashboardMessageStats {
  pendingIncomingTimestamps: number[];
  pendingIncomingCursor: number;
}

function createMutableStats(conversationId: string): MutableDashboardMessageStats {
  return {
    conversationId,
    incomingCount: 0,
    outgoingCount: 0,
    linksSentCount: 0,
    replyPairs: 0,
    totalReplyDelayMs: 0,
    pendingIncomingTimestamps: [],
    pendingIncomingCursor: 0,
  };
}

function parseTimestampMs(timestamp: string | undefined): number | null {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : null;
}

function chunkConversationIds(conversationIds: string[]): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < conversationIds.length; index += CONVERSATION_QUERY_CHUNK_SIZE) {
    chunks.push(conversationIds.slice(index, index + CONVERSATION_QUERY_CHUNK_SIZE));
  }
  return chunks;
}

function absorbMessage(
  stats: MutableDashboardMessageStats,
  message: Pick<DashboardMessageDoc, "fromMe" | "text" | "timestamp">,
): void {
  const timestampMs = parseTimestampMs(message.timestamp);
  if (timestampMs === null) return;

  if (message.fromMe === true) {
    stats.outgoingCount += 1;
    if (URL_PATTERN.test(message.text || "")) {
      stats.linksSentCount += 1;
    }

    if (stats.pendingIncomingCursor < stats.pendingIncomingTimestamps.length) {
      const pendingIncomingMs = stats.pendingIncomingTimestamps[stats.pendingIncomingCursor];
      stats.pendingIncomingCursor += 1;

      const replyDelayMs = timestampMs - pendingIncomingMs;
      if (replyDelayMs >= 0) {
        stats.replyPairs += 1;
        stats.totalReplyDelayMs += replyDelayMs;
      }
    }
    return;
  }

  if (message.fromMe !== false) {
    return;
  }

  stats.incomingCount += 1;
  stats.pendingIncomingTimestamps.push(timestampMs);
}

function sanitizeConversationIds(conversationIds: string[]): string[] {
  const uniqueIds = new Set<string>();
  for (const conversationId of conversationIds) {
    const normalized = conversationId.trim();
    if (normalized.length > 0) {
      uniqueIds.add(normalized);
    }
  }
  return Array.from(uniqueIds);
}

function stripMutableFields(
  statsByConversationId: Map<string, MutableDashboardMessageStats>,
): Map<string, DashboardMessageStats> {
  const finalized = new Map<string, DashboardMessageStats>();

  for (const [conversationId, stats] of statsByConversationId) {
    finalized.set(conversationId, {
      conversationId: stats.conversationId,
      incomingCount: stats.incomingCount,
      outgoingCount: stats.outgoingCount,
      linksSentCount: stats.linksSentCount,
      replyPairs: stats.replyPairs,
      totalReplyDelayMs: stats.totalReplyDelayMs,
    });
  }

  return finalized;
}

export async function getDashboardMessageStats(
  ownerEmail: string,
  conversationIds: string[],
): Promise<Map<string, DashboardMessageStats>> {
  const sanitizedConversationIds = sanitizeConversationIds(conversationIds);
  if (sanitizedConversationIds.length === 0) {
    return new Map();
  }

  const statsByConversationId = new Map<string, MutableDashboardMessageStats>();
  for (const conversationId of sanitizedConversationIds) {
    statsByConversationId.set(conversationId, createMutableStats(conversationId));
  }

  const supabase = getInboxSupabase();
  const chunks = chunkConversationIds(sanitizedConversationIds);
  for (const chunk of chunks) {
    const { data } = await supabase
      .from("inbox_messages")
      .select("id,conversation_id,payload,timestamp_text,is_empty")
      .eq("owner_email", ownerEmail)
      .in("conversation_id", chunk)
      .neq("is_empty", true)
      .not("timestamp_text", "is", null)
      .order("conversation_id", { ascending: true })
      .order("timestamp_text", { ascending: true })
      .order("id", { ascending: true });

    const messages = (data ?? []).map((row) => {
      const typed = row as {
        id: string;
        conversation_id: string;
        payload: { fromMe?: boolean; text?: string; timestamp?: string };
      };
      return {
        id: typed.id,
        conversationId: typed.conversation_id,
        fromMe: typed.payload.fromMe,
        text: typed.payload.text,
        timestamp: typed.payload.timestamp,
      } as DashboardMessageDoc;
    });

    for (const message of messages) {
      const stats = statsByConversationId.get(message.conversationId);
      if (!stats) continue;
      absorbMessage(stats, message);
    }
  }

  return stripMutableFields(statsByConversationId);
}
