import {
  CONVERSATIONS_COLLECTION,
  getInboxDb,
} from "@/lib/inbox/repository/core";
import type { ConversationSummary } from "@/types/inbox";

function normalizeSummarySection(
  value: unknown,
  fallbackTitle: string,
): { title: string; points: string[] } {
  const section =
    typeof value === "object" && value !== null
      ? (value as { title?: unknown; points?: unknown })
      : null;
  const title =
    typeof section?.title === "string" && section.title.trim().length > 0
      ? section.title.trim()
      : fallbackTitle;
  const points = Array.isArray(section?.points)
    ? section.points
        .filter((point): point is string => typeof point === "string")
        .map((point) => point.trim())
        .filter((point) => point.length > 0)
        .slice(0, 8)
    : [];

  return {
    title,
    points,
  };
}

export async function getConversationSummary(
  conversationId: string,
  ownerEmail: string,
): Promise<ConversationSummary | null> {
  const db = await getInboxDb();

  const doc = await db
    .collection(CONVERSATIONS_COLLECTION)
    .findOne(
      { id: conversationId, ownerEmail },
      { projection: { summary: 1 } },
    );

  const summaryValue =
    typeof doc === "object" && doc !== null
      ? (doc as { summary?: unknown }).summary
      : undefined;
  if (!summaryValue || typeof summaryValue !== "object") {
    return null;
  }

  const summaryObject = summaryValue as {
    clientSnapshot?: unknown;
    actionPlan?: unknown;
    generatedAt?: unknown;
  };

  const clientSnapshot = normalizeSummarySection(
    summaryObject.clientSnapshot,
    "Client Snapshot",
  );
  const actionPlan = normalizeSummarySection(
    summaryObject.actionPlan,
    "Action Plan",
  );
  if (clientSnapshot.points.length === 0 && actionPlan.points.length === 0) {
    return null;
  }

  return {
    clientSnapshot,
    actionPlan,
    generatedAt:
      typeof summaryObject.generatedAt === "string" &&
      summaryObject.generatedAt.trim().length > 0
        ? summaryObject.generatedAt
        : undefined,
  };
}

export async function updateConversationSummary(
  conversationId: string,
  ownerEmail: string,
  summary: ConversationSummary,
): Promise<ConversationSummary> {
  const db = await getInboxDb();

  const generatedAt = new Date().toISOString();
  const normalizedSummary: ConversationSummary = {
    clientSnapshot: normalizeSummarySection(
      summary.clientSnapshot,
      "Client Snapshot",
    ),
    actionPlan: normalizeSummarySection(summary.actionPlan, "Action Plan"),
    generatedAt,
  };

  await db
    .collection(CONVERSATIONS_COLLECTION)
    .updateOne(
      { id: conversationId, ownerEmail },
      { $set: { summary: normalizedSummary } },
    );

  return normalizedSummary;
}
