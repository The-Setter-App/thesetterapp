import { NextResponse } from "next/server";
import { buildTrackedBookingLink } from "@/lib/calendly/service";
import { findConversationById } from "@/lib/inboxRepository";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ recipientId: string }> },
) {
  try {
    const { workspaceOwnerEmail, sessionEmail } = await requireInboxWorkspaceContext();
    const { recipientId: conversationId } = await context.params;
    const conversation = await findConversationById(conversationId, workspaceOwnerEmail);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const result = await buildTrackedBookingLink({
      workspaceOwnerEmail,
      conversationId,
      createdByEmail: sessionEmail,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to generate Calendly link.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
