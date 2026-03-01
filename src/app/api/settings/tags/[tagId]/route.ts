import { NextResponse } from "next/server";
import { canAccessTagsSettings } from "@/lib/permissions";
import { isTagIconPack } from "@/lib/status/config";
import {
  deleteWorkspaceCustomTag,
  updateWorkspaceCustomTag,
  WorkspaceTagRepositoryError,
} from "@/lib/tagsRepository";
import { requireWorkspaceContext } from "@/lib/workspace";
import type { TagIconPack } from "@/types/tags";

export const dynamic = "force-dynamic";

interface UpdateTagBody {
  name?: unknown;
  description?: unknown;
  colorHex?: unknown;
  iconPack?: unknown;
  iconName?: unknown;
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
    const description =
      typeof body?.description === "string" ? body.description : "";
    const colorHex = typeof body?.colorHex === "string" ? body.colorHex : "";
    const iconPack = body?.iconPack;
    const iconName = typeof body?.iconName === "string" ? body.iconName : "";

    if (!isTagIconPack(iconPack)) {
      return NextResponse.json(
        { error: "Invalid icon pack." },
        { status: 400 },
      );
    }

    const tag = await updateWorkspaceCustomTag({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      tagId,
      name,
      description,
      colorHex,
      iconPack: iconPack as TagIconPack,
      iconName,
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
      { error: "Failed to update status tag." },
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
      { error: "Failed to delete status tag." },
      { status: 500 },
    );
  }
}
