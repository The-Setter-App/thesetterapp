import { NextResponse } from "next/server";
import { getConversationCalls } from "@/lib/calendly/service";
import { findConversationById } from "@/lib/inboxRepository";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ recipientId: string }> },
) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
    const { recipientId: conversationId } = await context.params;
    const conversation = await findConversationById(conversationId, workspaceOwnerEmail);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const calls = await getConversationCalls({
      workspaceOwnerEmail,
      conversationId,
    });
    return NextResponse.json(
      { calls },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to load calls." }, { status: 500 });
  }
}
