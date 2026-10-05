import { NextResponse } from "next/server";
import { refreshConversationAvatar } from "@/lib/inbox/avatarRefresh";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

// Asks Instagram for a current profile picture link for one conversation.
// The client calls this when the stored picture fails to load.
export async function POST(
  _request: Request,
  context: { params: Promise<{ recipientId: string }> },
) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
    const { recipientId: conversationId } = await context.params;

    const avatar = await refreshConversationAvatar({
      conversationId,
      workspaceOwnerEmail,
    });
    return NextResponse.json({ avatar }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: NO_STORE_HEADERS },
      );
    }
    console.error("[Avatar] Failed to refresh profile picture:", error);
    return NextResponse.json(
      { error: "Failed to refresh profile picture." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
