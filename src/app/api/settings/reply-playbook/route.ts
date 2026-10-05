import { NextResponse } from "next/server";
import { canManageReplyPlaybook } from "@/lib/permissions";
import {
  ReplyPlaybookError,
  saveReplyPlaybook,
} from "@/lib/replyPlaybookRepository";
import { AccessError, requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function PUT(request: Request) {
  try {
    const context = await requireWorkspaceContext();
    if (!canManageReplyPlaybook(context.user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: NO_STORE },
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const instructions: unknown =
      body && typeof body === "object"
        ? (body as { instructions?: unknown }).instructions
        : undefined;
    if (typeof instructions !== "string") {
      return NextResponse.json(
        { error: "The playbook text is required." },
        { status: 400, headers: NO_STORE },
      );
    }

    const saved = await saveReplyPlaybook({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      instructions,
      updatedByEmail: context.user.email,
    });
    return NextResponse.json({ instructions: saved }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof ReplyPlaybookError || error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: NO_STORE },
      );
    }
    console.error("[ReplyPlaybookAPI] Failed to save playbook:", error);
    return NextResponse.json(
      { error: "Could not save the playbook." },
      { status: 500, headers: NO_STORE },
    );
  }
}
