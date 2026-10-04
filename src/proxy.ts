import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { decrypt } from "@/lib/auth";
import { buildContentSecurityPolicy } from "@/lib/security/csp";
import {
  getAppOrigin,
  isMarketingHost,
  MARKETING_HOME_PATH,
} from "@/lib/waitlist/marketingHost";

// 1. Specify protected and public routes
const protectedRoutes = [
  "/dashboard",
  "/inbox",
  "/settings",
  "/calendar",
  "/leads",
  "/setter-ai",
  "/onboarding",
];
const publicRoutes = ["/login", "/"];
const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";

function applyContentSecurityPolicy(response: NextResponse): NextResponse {
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy({
      isDevelopment: IS_DEVELOPMENT,
    }),
  );
  return response;
}

export async function proxy(request: NextRequest) {
  // 2. Check if the current route is protected or public
  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route),
  );
  const isPublicRoute = publicRoutes.includes(path);

  // The marketing domain shows the waitlist at its root and hands every app
  // route to the app domain, where sessions and OAuth callbacks live.
  if (isMarketingHost(request.headers.get("host"))) {
    if (path === "/") {
      return applyContentSecurityPolicy(
        NextResponse.rewrite(new URL(MARKETING_HOME_PATH, request.url)),
      );
    }

    const appOrigin = getAppOrigin();
    if (appOrigin && (isProtectedRoute || path === "/login")) {
      return applyContentSecurityPolicy(
        NextResponse.redirect(
          new URL(`${path}${request.nextUrl.search}`, appOrigin),
        ),
      );
    }
  }

  // 3. Decrypt the session from the cookie
  const cookie = request.cookies.get("session")?.value;
  const session = cookie ? await decrypt(cookie).catch(() => null) : null;
  const isAuthenticated = Boolean(session?.email);

  // 4. Redirect to /login if the user is not authenticated
  if (isProtectedRoute && !isAuthenticated) {
    const response = NextResponse.redirect(new URL("/login", request.nextUrl));
    if (cookie) response.cookies.delete("session");
    return applyContentSecurityPolicy(response);
  }

  // 5. Redirect to /dashboard if the user is authenticated
  if (
    isPublicRoute &&
    isAuthenticated &&
    !request.nextUrl.pathname.startsWith("/dashboard")
  ) {
    return applyContentSecurityPolicy(
      NextResponse.redirect(new URL("/dashboard", request.nextUrl)),
    );
  }

  return applyContentSecurityPolicy(NextResponse.next());
}

// Routes Middleware should not run on
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
