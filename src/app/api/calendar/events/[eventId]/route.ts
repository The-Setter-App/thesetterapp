import { NextResponse } from "next/server";
import { getWorkspaceCalendarCallDetail } from "@/lib/calendly/service";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
    const { eventId } = await context.params;

    const event = await getWorkspaceCalendarCallDetail({
      workspaceOwnerEmail,
      eventId,
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    return NextResponse.json(
      { event },
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
      { error: "Failed to load event details." },
      { status: 500 },
    );
  }
}
