import { NextResponse } from "next/server";
import {
  addBlockedUsername,
  BlockedUsernameRepositoryError,
  listBlockedUsernames,
} from "@/lib/blockedUsernamesRepository";
import { canAccessBlockedUsersSettings } from "@/lib/permissions";
import { requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface CreateBlockedUsernameBody {
  username?: unknown;
}

export async function GET() {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessBlockedUsersSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const blockedUsernames = await listBlockedUsernames(
      context.workspaceOwnerEmail,
    );
    return NextResponse.json(
      { blockedUsernames },
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
      { error: "Failed to load blocked usernames." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessBlockedUsersSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request
      .json()
      .catch(() => null)) as CreateBlockedUsernameBody | null;
    const username = typeof body?.username === "string" ? body.username : "";

    const blockedUsername = await addBlockedUsername({
      workspaceOwnerEmail: context.workspaceOwnerEmail,
      username,
      createdByEmail: context.user.email,
    });

    return NextResponse.json(
      { blockedUsername },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof BlockedUsernameRepositoryError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to block username." },
      { status: 500 },
    );
  }
}
