import { NextResponse } from "next/server";
import { getInboxUsers } from "@/app/actions/inbox";
import { AccessError } from "@/lib/workspace";

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
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: error.status,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

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
