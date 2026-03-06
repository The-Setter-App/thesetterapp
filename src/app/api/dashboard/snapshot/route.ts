import { NextResponse } from "next/server";
import { getCachedDashboardSnapshot } from "@/lib/dashboard/snapshotCache";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
    const snapshot = await getCachedDashboardSnapshot(workspaceOwnerEmail);

    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error("[DashboardSnapshotAPI] Failed to load snapshot:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard snapshot." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
