import { NextResponse } from "next/server";
import {
  CommentAutomationRepositoryError,
  createAutomationVariant,
} from "@/lib/commentAutomationsRepository";
import { canAccessCommentAutomationsSettings } from "@/lib/permissions";
import { requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ automationId?: string }>;
}

interface CreateBody {
  message?: unknown;
  weight?: unknown;
}

export async function POST(request: Request, { params }: RouteParams) {
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

    const body = (await request.json().catch(() => null)) as CreateBody | null;
    const message = typeof body?.message === "string" ? body.message : "";
    const weight = typeof body?.weight === "number" ? body.weight : 1;

    const variant = await createAutomationVariant({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      automationId,
      message,
      weight,
    });

    return NextResponse.json(
      { variant },
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
      { error: "Failed to create variant." },
      { status: 500 },
    );
  }
}
