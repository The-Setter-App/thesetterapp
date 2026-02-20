import { NextResponse } from "next/server";
import {
  deleteSetterAiSession,
  updateSetterAiSessionLeadLink,
} from "@/lib/setterAiRepository";
import { AccessError, requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionEmail } = await requireWorkspaceContext();
    const { sessionId } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      linkedInboxConversationId?: string | null;
      linkedInboxConversationLabel?: string | null;
    } | null;

    const linkedInboxConversationId =
      typeof body?.linkedInboxConversationId === "string"
        ? body.linkedInboxConversationId
        : body?.linkedInboxConversationId === null
          ? null
          : null;
    const linkedInboxConversationLabel =
      typeof body?.linkedInboxConversationLabel === "string"
        ? body.linkedInboxConversationLabel
        : body?.linkedInboxConversationLabel === null
          ? null
          : null;

    const session = await updateSetterAiSessionLeadLink(sessionEmail, sessionId, {
      linkedInboxConversationId,
      linkedInboxConversationLabel,
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json(
      { session },
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
    return NextResponse.json({ error: "Failed to update session." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionEmail } = await requireWorkspaceContext();
    const { sessionId } = await context.params;
    const deleted = await deleteSetterAiSession(sessionEmail, sessionId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to delete session." },
      { status: 500 },
    );
  }
}
