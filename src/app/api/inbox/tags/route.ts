import { NextResponse } from "next/server";
import { listWorkspaceAssignableTags } from "@/lib/tagsRepository";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
    const tags = await listWorkspaceAssignableTags(workspaceOwnerEmail);
    return NextResponse.json(
      { tags },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[InboxTagsAPI] Failed to load tags:", error);
    return NextResponse.json(
      { error: "Failed to load inbox tags." },
      { status: 500 },
    );
  }
}
