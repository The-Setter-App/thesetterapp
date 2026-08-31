import { NextResponse } from "next/server";
import {
  CommentAutomationRepositoryError,
  deleteAutomationVariant,
} from "@/lib/commentAutomationsRepository";
import { canAccessCommentAutomationsSettings } from "@/lib/permissions";
import { requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ automationId?: string; variantId?: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessCommentAutomationsSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const routeParams = await params;
    const variantId =
      typeof routeParams.variantId === "string" ? routeParams.variantId : "";

    await deleteAutomationVariant({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      variantId,
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
      { error: "Failed to delete variant." },
      { status: 500 },
    );
  }
}
