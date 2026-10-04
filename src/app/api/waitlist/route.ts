import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/otpSecurity";
import { joinWaitlist } from "@/lib/waitlist/joinWaitlist";
import { normalizeWaitlistEmail } from "@/lib/waitlist/validation";

export const dynamic = "force-dynamic";

interface JoinWaitlistBody {
  email?: unknown;
  // Honeypot: hidden from people, so only automated submissions fill it.
  company?: unknown;
}

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  try {
    const body = (await request
      .json()
      .catch(() => null)) as JoinWaitlistBody | null;

    const email = normalizeWaitlistEmail(body?.email);
    if (!email) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    if (typeof body?.company === "string" && body.company.trim()) {
      return NextResponse.json(
        { success: true },
        { headers: NO_STORE_HEADERS },
      );
    }

    const result = await joinWaitlist({
      email,
      clientIp: getClientIp(request.headers),
    });

    if (result.status === "rate_limited") {
      return NextResponse.json(
        { error: "Too many signups from this network. Try again later." },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            "Retry-After": String(result.retryAfterSeconds),
          },
        },
      );
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[Waitlist] Failed to join waitlist:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
