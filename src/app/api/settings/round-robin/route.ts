import { NextResponse } from "next/server";
import { canAccessDistributionSettings } from "@/lib/permissions";
import {
  isRoundRobinEnabled,
  listRoundRobinMembers,
  RoundRobinRepositoryError,
  setRoundRobinEnabled,
} from "@/lib/roundRobinRepository";
import { requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface UpdateBody {
  enabled?: unknown;
}

export async function GET() {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessDistributionSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [enabled, members] = await Promise.all([
      isRoundRobinEnabled(context.workspaceOwnerEmail),
      listRoundRobinMembers(context.workspaceOwnerEmail),
    ]);

    return NextResponse.json(
      { enabled, members },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof RoundRobinRepositoryError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to load lead distribution settings." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessDistributionSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as UpdateBody | null;
    if (typeof body?.enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean." },
        { status: 400 },
      );
    }

    await setRoundRobinEnabled(context.workspaceOwnerEmail, body.enabled);
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof RoundRobinRepositoryError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to update lead distribution settings." },
      { status: 500 },
    );
  }
}
