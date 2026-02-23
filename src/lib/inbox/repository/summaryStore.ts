import { CONVERSATIONS_COLLECTION, getInboxSupabase } from "@/lib/inbox/repository/core";
import type { ConversationSummary } from "@/types/inbox";

function normalizeSummarySection(
  value: unknown,
  fallbackTitle: string,
): { title: string; points: string[] } {
  const section = typeof value === "object" && value !== null ? (value as { title?: string; points?: string[] }) : null;
  const title = section?.title && section.title.trim().length > 0 ? section.title.trim() : fallbackTitle;
  const points = Array.isArray(section?.points)
    ? section.points
        .filter((point) => typeof point === "string")
        .map((point) => point.trim())
        .filter((point) => point.length > 0)
        .slice(0, 8)
    : [];

  return { title, points };
}

export async function getConversationSummary(
  conversationId: string,
  ownerEmail: string,
): Promise<ConversationSummary | null> {
  const supabase = getInboxSupabase();

  const { data } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("summary")
    .eq("id", conversationId)
    .eq("owner_email", ownerEmail)
    .maybeSingle();

  const summaryValue = (data as { summary?: unknown } | null)?.summary;
  if (!summaryValue || typeof summaryValue !== "object") {
    return null;
  }

  const summaryObject = summaryValue as {
    clientSnapshot?: unknown;
    actionPlan?: unknown;
    generatedAt?: unknown;
  };

  const clientSnapshot = normalizeSummarySection(summaryObject.clientSnapshot, "Client Snapshot");
  const actionPlan = normalizeSummarySection(summaryObject.actionPlan, "Action Plan");

  if (clientSnapshot.points.length === 0 && actionPlan.points.length === 0) {
    return null;
  }

  return {
    clientSnapshot,
    actionPlan,
    generatedAt:
      typeof summaryObject.generatedAt === "string" && summaryObject.generatedAt.trim().length > 0
        ? summaryObject.generatedAt
        : undefined,
  };
}

export async function updateConversationSummary(
  conversationId: string,
  ownerEmail: string,
  summary: ConversationSummary,
): Promise<ConversationSummary> {
  const supabase = getInboxSupabase();

  const generatedAt = new Date().toISOString();
  const normalizedSummary: ConversationSummary = {
    clientSnapshot: normalizeSummarySection(summary.clientSnapshot, "Client Snapshot"),
    actionPlan: normalizeSummarySection(summary.actionPlan, "Action Plan"),
    generatedAt,
  };

  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update({ summary: normalizedSummary, updated_at: generatedAt })
    .eq("id", conversationId)
    .eq("owner_email", ownerEmail);

  return normalizedSummary;
}
