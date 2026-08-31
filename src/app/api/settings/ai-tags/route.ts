import { NextResponse } from "next/server";
import {
  AiTagRepositoryError,
  createWorkspaceAiTag,
  listWorkspaceAiTags,
} from "@/lib/aiTagsRepository";
import { canAccessAiTagsSettings } from "@/lib/permissions";
import { requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface CreateAiTagBody {
  name?: unknown;
  criteria?: unknown;
  colorHex?: unknown;
}

export async function GET() {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessAiTagsSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const aiTags = await listWorkspaceAiTags(context.workspaceOwnerEmail);
    return NextResponse.json(
      { aiTags },
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
      { error: "Failed to load AI tags." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessAiTagsSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request
      .json()
      .catch(() => null)) as CreateAiTagBody | null;
    const name = typeof body?.name === "string" ? body.name : "";
    const criteria = typeof body?.criteria === "string" ? body.criteria : "";
    const colorHex = typeof body?.colorHex === "string" ? body.colorHex : "";

    const aiTag = await createWorkspaceAiTag({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      name,
      criteria,
      colorHex,
      createdByEmail: context.user.email,
    });

    return NextResponse.json(
      { aiTag },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof AiTagRepositoryError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to create AI tag." },
      { status: 500 },
    );
  }
}
