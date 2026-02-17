import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';
import { getUser } from '@/lib/userRepository';

// 1. Specify protected and public routes
const protectedRoutes = ['/dashboard', '/inbox', '/settings', '/calendar', '/leads', '/setter-ai'];
const publicRoutes = ['/login', '/signup', '/'];

export async function proxy(request: NextRequest) {
  // 2. Check if the current route is protected or public
  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
  const isPublicRoute = publicRoutes.includes(path);

  // 3. Decrypt the session from the cookie
  const cookie = request.cookies.get('session')?.value;
  const session = cookie ? await decrypt(cookie).catch(() => null) : null;
  const hasActiveUser = session?.email
    ? Boolean(
        await getUser(session.email).catch(() => null)
      )
    : false;
  const isAuthenticated = Boolean(session?.email && hasActiveUser);

  // 4. Redirect to /login if the user is not authenticated
  if (isProtectedRoute && !isAuthenticated) {
    const response = NextResponse.redirect(new URL('/login', request.nextUrl));
    if (cookie) response.cookies.delete('session');
    return response;
  }

  // 5. Redirect to /dashboard if the user is authenticated
  if (
    isPublicRoute &&
    isAuthenticated &&
    !request.nextUrl.pathname.startsWith('/dashboard')
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
  }

  if (cookie && session?.email && !hasActiveUser) {
    const response = NextResponse.next();
    response.cookies.delete('session');
    return response;
  }

  return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
