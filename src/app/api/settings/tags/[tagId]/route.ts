import { NextResponse } from "next/server";
import { canAccessTagsSettings } from "@/lib/permissions";
import { isTagCategory } from "@/lib/tags/config";
import {
  deleteWorkspaceCustomTag,
  updateWorkspaceCustomTag,
  WorkspaceTagRepositoryError,
} from "@/lib/tagsRepository";
import { requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface UpdateTagBody {
  name?: unknown;
  category?: unknown;
  description?: unknown;
}

interface RouteParams {
  params: Promise<{ tagId?: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessTagsSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const routeParams = await params;
    const tagId =
      typeof routeParams.tagId === "string" ? routeParams.tagId : "";
    const body = (await request
      .json()
      .catch(() => null)) as UpdateTagBody | null;
    const name = typeof body?.name === "string" ? body.name : "";
    const category = body?.category;
    const description =
      typeof body?.description === "string" ? body.description : "";

    if (!isTagCategory(category)) {
      return NextResponse.json(
        { error: "Invalid tag category." },
        { status: 400 },
      );
    }

    const tag = await updateWorkspaceCustomTag({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      tagId,
      name,
      category,
      description,
    });

    return NextResponse.json(
      { tag },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof WorkspaceTagRepositoryError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to update tag." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessTagsSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const routeParams = await params;
    const tagId =
      typeof routeParams.tagId === "string" ? routeParams.tagId : "";
    await deleteWorkspaceCustomTag({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      tagId,
    });

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof WorkspaceTagRepositoryError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to delete tag." },
      { status: 500 },
    );
  }
}
