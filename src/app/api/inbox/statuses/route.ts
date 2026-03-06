import { NextResponse } from "next/server";
import { listWorkspaceAssignableTags } from "@/lib/tagsRepository";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
    const statuses = await listWorkspaceAssignableTags(workspaceOwnerEmail);
    return NextResponse.json(
      { statuses },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[InboxStatusesAPI] Failed to load statuses:", error);
    return NextResponse.json(
      { error: "Failed to load inbox statuses." },
      { status: 500 },
    );
  }
}
