import { NextResponse } from "next/server";
import { canAccessDistributionSettings } from "@/lib/permissions";
import {
  RoundRobinRepositoryError,
  setRoundRobinMemberWeight,
} from "@/lib/roundRobinRepository";
import { requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ memberEmail?: string }>;
}

interface UpdateWeightBody {
  weight?: unknown;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessDistributionSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const routeParams = await params;
    const memberEmail =
      typeof routeParams.memberEmail === "string"
        ? decodeURIComponent(routeParams.memberEmail)
        : "";

    const body = (await request
      .json()
      .catch(() => null)) as UpdateWeightBody | null;
    const weight = typeof body?.weight === "number" ? body.weight : Number.NaN;

    await setRoundRobinMemberWeight({
      ownerEmail: context.workspaceOwnerEmail,
      memberEmail,
      weight,
    });

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
      { error: "Failed to update weight." },
      { status: 500 },
    );
  }
}
