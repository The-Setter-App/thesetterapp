import { NextResponse } from "next/server";
import { getInboxUsers } from "@/app/actions/inbox";

export async function GET() {
  try {
    const users = await getInboxUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("[InboxApi] Failed to fetch conversations:", error);
    return NextResponse.json(
      { error: "Failed to load conversations." },
      { status: 500 },
    );
  }
}
