import { NextResponse } from "next/server";
import { getCalendlyConnectionState } from "@/lib/calendly/service";
import { canAccessIntegrationSettings } from "@/lib/permissions";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { workspaceOwnerEmail, user } = await requireInboxWorkspaceContext();
    const connection = await getCalendlyConnectionState(workspaceOwnerEmail);
    return NextResponse.json(
      {
        connected: Boolean(connection),
        canManageIntegration: canAccessIntegrationSettings(user.role),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to load Calendly connection state." },
      { status: 500 },
    );
  }
}
