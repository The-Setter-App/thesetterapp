import { NextResponse } from "next/server";
import { getInboxConnectionState } from "@/app/actions/inbox";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const connectionState = await getInboxConnectionState();
    return NextResponse.json(connectionState, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[InboxApi] Failed to fetch connection state:", error);
    return NextResponse.json(
      { error: "Failed to load inbox connection state." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
