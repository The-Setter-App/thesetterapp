import { NextResponse } from "next/server";
import { deleteSetterAiSession } from "@/lib/setterAiRepository";
import { AccessError, requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

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
