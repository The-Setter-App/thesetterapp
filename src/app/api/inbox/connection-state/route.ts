import { NextResponse } from "next/server";
import { getInboxConnectionState } from "@/app/actions/inbox";

export async function GET() {
  try {
    const connectionState = await getInboxConnectionState();
    return NextResponse.json(connectionState);
  } catch (error) {
    console.error("[InboxApi] Failed to fetch connection state:", error);
    return NextResponse.json(
      { error: "Failed to load inbox connection state." },
      { status: 500 },
    );
  }
}
