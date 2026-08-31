import { NextResponse } from "next/server";
import {
  CommentAutomationRepositoryError,
  deleteCommentAutomation,
  setCommentAutomationEnabled,
} from "@/lib/commentAutomationsRepository";
import { canAccessCommentAutomationsSettings } from "@/lib/permissions";
import { requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ automationId?: string }>;
}

interface UpdateBody {
  enabled?: unknown;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessCommentAutomationsSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const routeParams = await params;
    const automationId =
      typeof routeParams.automationId === "string"
        ? routeParams.automationId
        : "";
    const body = (await request.json().catch(() => null)) as UpdateBody | null;
    if (typeof body?.enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean." },
        { status: 400 },
      );
    }

    await setCommentAutomationEnabled({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      automationId,
      enabled: body.enabled,
    });

    return NextResponse.json(
      { success: true },
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
      { error: "Failed to update automation." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessCommentAutomationsSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const routeParams = await params;
    const automationId =
      typeof routeParams.automationId === "string"
        ? routeParams.automationId
        : "";

    await deleteCommentAutomation({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      automationId,
    });

    return NextResponse.json(
      { success: true },
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
      { error: "Failed to delete automation." },
      { status: 500 },
    );
  }
}
