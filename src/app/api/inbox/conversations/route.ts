import { NextResponse } from "next/server";
import { getInboxUsers } from "@/app/actions/inbox";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await getInboxUsers();
    return NextResponse.json(
      { users },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("[InboxApi] Failed to fetch conversations:", error);
    return NextResponse.json(
      { error: "Failed to load conversations." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
