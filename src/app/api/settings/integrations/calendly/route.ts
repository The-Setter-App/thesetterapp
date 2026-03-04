import { NextResponse } from "next/server";
import { canAccessIntegrationSettings } from "@/lib/permissions";
import {
  connectCalendlyForWorkspace,
  disconnectCalendlyForWorkspace,
  getCalendlyConnectionState,
} from "@/lib/calendly/service";
import { requireWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

interface ConnectBody {
  personalAccessToken?: unknown;
  schedulingUrl?: unknown;
}

export async function GET() {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessIntegrationSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const connection = await getCalendlyConnectionState(context.workspaceOwnerEmail);
    return NextResponse.json(
      connection
        ? {
            connected: true,
            connectedAt: connection.connectedAt,
            schedulingUrl: connection.schedulingUrl,
          }
        : { connected: false },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Calendly state.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireWorkspaceContext();
    if (!canAccessIntegrationSettings(context.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as ConnectBody | null;
    const personalAccessToken =
      typeof body?.personalAccessToken === "string" ? body.personalAccessToken : "";
    const schedulingUrl =
      typeof body?.schedulingUrl === "string" ? body.schedulingUrl : "";

    const connection = await connectCalendlyForWorkspace(context.workspaceOwnerEmail, {
      personalAccessToken,
      schedulingUrl,
    });
    return NextResponse.json(
      {
        connected: true,
        connectedAt: connection.connectedAt,
        schedulingUrl: connection.schedulingUrl,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect Calendly.";
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
