import { NextResponse } from "next/server";
import {
  AiTagRepositoryError,
  deleteWorkspaceAiTag,
} from "@/lib/aiTagsRepository";
import { canAccessAiTagsSettings } from "@/lib/permissions";
import { requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ tagId?: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessAiTagsSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const routeParams = await params;
    const tagId =
      typeof routeParams.tagId === "string" ? routeParams.tagId : "";

    await deleteWorkspaceAiTag({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      tagId,
    });

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof AiTagRepositoryError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to delete AI tag." },
      { status: 500 },
    );
  }
}
