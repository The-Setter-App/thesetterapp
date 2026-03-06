import { randomBytes } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  buildCalendlyOAuthAuthorizeUrl,
  resolveCalendlyOAuthRedirectUri,
} from "@/lib/calendly/oauth";
import { getUser } from "@/lib/userRepository";

export const dynamic = "force-dynamic";

const CALENDLY_OAUTH_STATE_COOKIE = "calendly_oauth_state";

function toIntegrationRedirect(
  request: NextRequest,
  error: string,
): NextResponse {
  const base = process.env.APP_URL?.trim() || request.nextUrl.origin;
  const url = new URL("/settings/integration", base);
  url.searchParams.set("calendly_error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.redirect(
      new URL("/login?redirect=/settings/integration", request.nextUrl.origin),
    );
  }

  const user = await getUser(session.email);
  if (!user || user.role !== "owner") {
    return NextResponse.redirect(
      new URL("/settings/team", request.nextUrl.origin),
    );
  }

  try {
    const state = randomBytes(16).toString("hex");
    const redirectUri = resolveCalendlyOAuthRedirectUri(request.nextUrl.origin);
    const authorizeUrl = buildCalendlyOAuthAuthorizeUrl({
      state,
      redirectUri,
    });

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(CALENDLY_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });
    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to initialize Calendly OAuth.";
    return toIntegrationRedirect(request, message);
  }
}
