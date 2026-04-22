import { NextResponse } from "next/server";
import {
  disconnectCalendlyForWorkspace,
  getCalendlyConnectionSettingsState,
  updateCalendlySchedulingUrlForWorkspace,
} from "@/lib/calendly/service";
import { canAccessIntegrationSettings } from "@/lib/permissions";
import { requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface UpdateBody {
  schedulingUrl?: unknown;
}

export async function GET() {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessIntegrationSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const connection = await getCalendlyConnectionSettingsState(
      context.workspaceOwnerEmail,
    );
    return NextResponse.json(connection, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Calendly state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Calendly now uses OAuth. Use /api/auth/calendly/login." },
    { status: 405 },
  );
}

export async function PATCH(request: Request) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessIntegrationSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as UpdateBody | null;
    const schedulingUrl =
      typeof body?.schedulingUrl === "string" ? body.schedulingUrl : "";

    const connection = await updateCalendlySchedulingUrlForWorkspace(
      context.workspaceOwnerEmail,
      {
        schedulingUrl,
      },
    );

    return NextResponse.json(connection, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update Calendly settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessIntegrationSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await disconnectCalendlyForWorkspace(context.workspaceOwnerEmail);
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect Calendly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
