import { NextResponse } from "next/server";
import { ensureWorkspaceInboxData } from "@/lib/inbox/bootstrap";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
    await ensureWorkspaceInboxData(workspaceOwnerEmail);

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error(
      "[DashboardBootstrapAPI] Failed to bootstrap inbox data:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to bootstrap dashboard data." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
