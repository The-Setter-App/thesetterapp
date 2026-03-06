import { type NextRequest, NextResponse } from "next/server";
import { decryptData } from "@/lib/crypto";
import { sendMessage } from "@/lib/graphApi";
import { emitWorkspaceSseEvent } from "@/lib/inbox/sseBus";
import { findConversationById } from "@/lib/inboxRepository";
import { getInstagramAccountById } from "@/lib/userRepository";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ recipientId: string }> },
) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();

    const { recipientId: conversationId } = await context.params;
    const body = (await request.json()) as {
      text?: string;
      clientTempId?: string;
    };
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const conversation = await findConversationById(
      conversationId,
      workspaceOwnerEmail,
    );
    if (!conversation?.recipientId || !conversation.accountId) {
      return NextResponse.json(
        { error: "No active conversation found" },
        { status: 404 },
      );
    }

    const account = await getInstagramAccountById(
      workspaceOwnerEmail,
      conversation.accountId,
    );
    if (!account) {
      return NextResponse.json(
        { error: "No active Instagram connection found" },
        { status: 400 },
      );
    }

    const accessToken = decryptData(account.accessToken);
    const sendResult = await sendMessage(
      account.pageId,
      conversation.recipientId,
      text,
      accessToken,
      account.graphVersion,
      {
        tag: "HUMAN_AGENT",
      },
    );

    if (sendResult.messageId) {
      emitWorkspaceSseEvent(workspaceOwnerEmail, {
        type: "message_echo",
        timestamp: new Date().toISOString(),
        data: {
          senderId: account.instagramUserId,
          recipientId: conversation.recipientId,
          conversationId,
          accountId: conversation.accountId,
          messageId: sendResult.messageId,
          clientTempId: body.clientTempId || undefined,
          text,
          timestamp: Date.now(),
          fromMe: true,
        },
      });
    }

    return NextResponse.json({
      accepted: true,
      clientTempId: body.clientTempId || null,
      messageId: sendResult.messageId || null,
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[InboxSendAPI] Failed to send message:", error);
    const message = error instanceof Error ? error.message : "Failed to send";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
