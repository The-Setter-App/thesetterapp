import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { REQUIRED_INSTAGRAM_SCOPES } from '@/lib/instagramPermissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const appId = process.env.FB_APP_ID;
  const baseUrl = process.env.APP_URL || request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  
  if (!appId) {
    return NextResponse.json(
      { error: 'FB_APP_ID is not configured in environment variables' },
      { status: 500 }
    );
  }

  // Generate a random state for CSRF protection
  const state = randomBytes(16).toString('hex');
  
  // Store state in a cookie to verify it in the callback
  // In a production app, this should be signed or stored in a session
  
  // Scopes required for the app functionality
  // instagram_basic: Basic profile info
  // instagram_manage_comments: Reply to comments
  // instagram_manage_messages: Send/receive messages (DMs)
  // pages_show_list: List pages to find the connected one
  // pages_manage_metadata: Subscribe to webhooks
  const scopes = REQUIRED_INSTAGRAM_SCOPES.join(',');

  const url = new URL('https://www.facebook.com/v24.0/dialog/oauth');
  url.searchParams.append('client_id', appId);
  url.searchParams.append('redirect_uri', redirectUri);
  url.searchParams.append('state', state);
  url.searchParams.append('scope', scopes);
  url.searchParams.append('response_type', 'code');
  // Force Facebook to re-evaluate granted page permissions and page selection.
  url.searchParams.append('auth_type', 'rerequest');
  url.searchParams.append('return_scopes', 'true');

  const response = NextResponse.redirect(url.toString());
  
  // Set state cookie with 10 minute expiry
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
    sameSite: 'lax',
  });

  return response;
}
