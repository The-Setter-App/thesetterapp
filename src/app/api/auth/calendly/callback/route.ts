import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveCalendlyOAuthRedirectUri } from "@/lib/calendly/oauth";
import { connectCalendlyForWorkspaceOAuth } from "@/lib/calendly/service";
import { getUser, getWorkspaceOwnerEmail } from "@/lib/userRepository";

export const dynamic = "force-dynamic";

const CALENDLY_OAUTH_STATE_COOKIE = "calendly_oauth_state";

function toIntegrationUrl(input: {
  request: NextRequest;
  status: "success" | "error";
  message: string;
}): URL {
  const base = process.env.APP_URL?.trim() || input.request.nextUrl.origin;
  const url = new URL("/settings/integration", base);
  if (input.status === "success") {
    url.searchParams.set("calendly_success", input.message);
  } else {
    url.searchParams.set("calendly_error", input.message);
  }
  return url;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code") || "";
  const state = searchParams.get("state") || "";
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  if (oauthError) {
    const message = oauthErrorDescription || oauthError;
    return NextResponse.redirect(
      toIntegrationUrl({ request, status: "error", message }),
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(CALENDLY_OAUTH_STATE_COOKIE)?.value || "";
  cookieStore.delete(CALENDLY_OAUTH_STATE_COOKIE);

  if (!code || !state || !storedState || storedState !== state) {
    return NextResponse.redirect(
      toIntegrationUrl({
        request,
        status: "error",
        message: "Invalid Calendly OAuth state.",
      }),
    );
  }

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

  const workspaceOwnerEmail = await getWorkspaceOwnerEmail(user.email);
  if (!workspaceOwnerEmail) {
    return NextResponse.redirect(
      toIntegrationUrl({
        request,
        status: "error",
        message: "Workspace owner context could not be resolved.",
      }),
    );
  }

  try {
    const redirectUri = resolveCalendlyOAuthRedirectUri(request.nextUrl.origin);
    await connectCalendlyForWorkspaceOAuth({
      workspaceOwnerEmail,
      authorizationCode: code,
      redirectUri,
    });

    return NextResponse.redirect(
      toIntegrationUrl({
        request,
        status: "success",
        message: "connected",
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect Calendly.";
    return NextResponse.redirect(
      toIntegrationUrl({ request, status: "error", message }),
    );
  }
}
