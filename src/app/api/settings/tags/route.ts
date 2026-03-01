import { NextResponse } from "next/server";
import { canAccessTagsSettings } from "@/lib/permissions";
import { isTagIconPack } from "@/lib/status/config";
import {
  createWorkspaceCustomTag,
  listWorkspaceAssignableTags,
  WorkspaceTagRepositoryError,
} from "@/lib/tagsRepository";
import { requireWorkspaceContext } from "@/lib/workspace";
import type { TagIconPack } from "@/types/tags";

export const dynamic = "force-dynamic";

interface CreateTagBody {
  name?: unknown;
  description?: unknown;
  colorHex?: unknown;
  iconPack?: unknown;
  iconName?: unknown;
}

export async function GET() {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessTagsSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tags = await listWorkspaceAssignableTags(context.workspaceOwnerEmail);
    return NextResponse.json(
      { tags },
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
      { error: "Failed to load status tags." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessTagsSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request
      .json()
      .catch(() => null)) as CreateTagBody | null;
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

    const tag = await createWorkspaceCustomTag({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      name,
      description,
      colorHex,
      iconPack: iconPack as TagIconPack,
      iconName,
      createdByEmail: context.user.email,
      createdByLabel: context.user.displayName || context.user.email,
    });

    return NextResponse.json(
      { tag },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof WorkspaceTagRepositoryError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to create status tag." },
      { status: 500 },
    );
  }
}
