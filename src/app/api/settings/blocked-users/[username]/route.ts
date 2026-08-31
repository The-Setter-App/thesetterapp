import { NextResponse } from "next/server";
import {
  BlockedUsernameRepositoryError,
  removeBlockedUsername,
} from "@/lib/blockedUsernamesRepository";
import { canAccessBlockedUsersSettings } from "@/lib/permissions";
import { requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ username?: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessBlockedUsersSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const routeParams = await params;
    const username =
      typeof routeParams.username === "string"
        ? decodeURIComponent(routeParams.username)
        : "";

    await removeBlockedUsername({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      username,
    });

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof BlockedUsernameRepositoryError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to unblock username." },
      { status: 500 },
    );
  }
}
