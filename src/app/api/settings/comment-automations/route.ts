import { NextResponse } from "next/server";
import {
  CommentAutomationRepositoryError,
  createCommentAutomation,
  listCommentAutomations,
} from "@/lib/commentAutomationsRepository";
import { canAccessCommentAutomationsSettings } from "@/lib/permissions";
import { requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface CreateBody {
  name?: unknown;
  keyword?: unknown;
  mediaId?: unknown;
  replyMessage?: unknown;
}

export async function GET() {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessCommentAutomationsSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const automations = await listCommentAutomations(
      context.workspaceOwnerEmail,
    );
    return NextResponse.json(
      { automations },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof CommentAutomationRepositoryError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to load comment automations." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessCommentAutomationsSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as CreateBody | null;
    const name = typeof body?.name === "string" ? body.name : "";
    const keyword = typeof body?.keyword === "string" ? body.keyword : "";
    const mediaId = typeof body?.mediaId === "string" ? body.mediaId : "";
    const replyMessage =
      typeof body?.replyMessage === "string" ? body.replyMessage : "";

    const automation = await createCommentAutomation({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      name,
      keyword,
      mediaId,
      replyMessage,
      createdByEmail: context.user.email,
    });

    return NextResponse.json(
      { automation },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof CommentAutomationRepositoryError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to create comment automation." },
      { status: 500 },
    );
  }
}
