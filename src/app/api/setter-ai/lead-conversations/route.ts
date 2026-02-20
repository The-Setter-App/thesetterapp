import { NextRequest, NextResponse } from "next/server";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";
import { getConversationsFromDb } from "@/lib/inboxRepository";
import type { LeadConversationSummary } from "@/types/setterAiLeadContext";

export const dynamic = "force-dynamic";

function parseLimit(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

function getSortKey(updatedAt?: string): number {
  if (!updatedAt) return 0;
  const ms = Date.parse(updatedAt);
  return Number.isFinite(ms) ? ms : 0;
}

export async function GET(request: NextRequest) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const limit = parseLimit(searchParams.get("limit"));

    const conversations = await getConversationsFromDb(workspaceOwnerEmail);

    const filtered = conversations.filter((conv) => {
      if (!q) return true;
      const name = (conv.name || "").toLowerCase();
      const lastMessage = (conv.lastMessage || "").toLowerCase();
      return name.includes(q) || lastMessage.includes(q);
    });

    filtered.sort((a, b) => {
      const timeDiff = getSortKey(b.updatedAt) - getSortKey(a.updatedAt);
      if (timeDiff !== 0) return timeDiff;
      return b.id.localeCompare(a.id);
    });

    const results: LeadConversationSummary[] = filtered.slice(0, limit).map((conv) => ({
      conversationId: conv.id,
      name: conv.name,
      avatarUrl: conv.avatar ?? null,
      lastMessagePreview: conv.lastMessage || "",
      updatedAt: conv.updatedAt ?? null,
    }));

    return NextResponse.json(
      { conversations: results },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Failed to load conversations." },
      { status: 500 },
    );
  }
}

