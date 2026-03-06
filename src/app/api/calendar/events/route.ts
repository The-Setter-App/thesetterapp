import { NextResponse } from "next/server";
import { getWorkspaceCalendarCalls } from "@/lib/calendly/service";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

function isValidationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.startsWith("Invalid calendar range:");
}

export async function GET(request: Request) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const events = await getWorkspaceCalendarCalls({
      workspaceOwnerEmail,
      fromIso: from || "",
      toIso: to || "",
    });

    return NextResponse.json(
      { events },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (isValidationError(error)) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to load calendar events." },
      { status: 500 },
    );
  }
}
