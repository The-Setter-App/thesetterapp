import { NextResponse } from "next/server";
import { canAccessTagsSettings } from "@/lib/permissions";
import { isTagCategory } from "@/lib/tags/config";
import {
  createWorkspaceCustomTag,
  listWorkspaceCustomTags,
  WorkspaceTagRepositoryError,
} from "@/lib/tagsRepository";
import { requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface CreateTagBody {
  name?: unknown;
  category?: unknown;
  description?: unknown;
}

export async function GET() {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessTagsSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tags = await listWorkspaceCustomTags(context.workspaceOwnerEmail);
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
      { error: "Failed to load tags." },
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
    const category = body?.category;
    const description =
      typeof body?.description === "string" ? body.description : "";

    if (!isTagCategory(category)) {
      return NextResponse.json(
        { error: "Invalid tag category." },
        { status: 400 },
      );
    }

    const tag = await createWorkspaceCustomTag({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      name,
      category,
      description,
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
      { error: "Failed to create tag." },
      { status: 500 },
    );
  }
}
