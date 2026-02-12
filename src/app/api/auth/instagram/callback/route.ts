import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { updateInstagramConfig } from '@/lib/userRepository';
import { encryptData } from '@/lib/crypto';
import { InstagramConfig } from '@/types/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.APP_URL || request.nextUrl.origin;

  // 1. Validate State and Session
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  // const errorReason = searchParams.get('error_reason');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(new URL(`/settings?error=${errorDescription || error}`, baseUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings?error=missing_code_or_state', baseUrl));
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get('oauth_state')?.value;

  if (!storedState || state !== storedState) {
    return NextResponse.redirect(new URL('/settings?error=invalid_state', baseUrl));
  }

  // Clear state cookie
  cookieStore.delete('oauth_state');

  const session = await getSession();
  if (!session || !session.email) {
    return NextResponse.redirect(new URL('/login?redirect=/settings', baseUrl));
  }

  try {
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    // baseUrl is already defined above
    const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

    if (!appId || !appSecret) {
      throw new Error('Facebook App Configuration missing');
    }

    // 2. Exchange Code for Short-Lived Token
    const tokenUrl = new URL('https://graph.facebook.com/v24.0/oauth/access_token');
    tokenUrl.searchParams.append('client_id', appId);
    tokenUrl.searchParams.append('client_secret', appSecret);
    tokenUrl.searchParams.append('redirect_uri', redirectUri);
    tokenUrl.searchParams.append('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(`Failed to exchange code: ${tokenData.error?.message || 'Unknown error'}`);
    }

    const shortLivedToken = tokenData.access_token;

    // 3. Exchange for Long-Lived Token
    const longLivedUrl = new URL('https://graph.facebook.com/v24.0/oauth/access_token');
    longLivedUrl.searchParams.append('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.append('client_id', appId);
    longLivedUrl.searchParams.append('client_secret', appSecret);
    longLivedUrl.searchParams.append('fb_exchange_token', shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedRes.json();

    if (!longLivedRes.ok) {
      throw new Error(`Failed to get long-lived token: ${longLivedData.error?.message}`);
    }

    const longLivedToken = longLivedData.access_token;

    // 4. Get User's Pages
    const accountsUrl = new URL('https://graph.facebook.com/v24.0/me/accounts');
    accountsUrl.searchParams.append('access_token', longLivedToken);
    
    const accountsRes = await fetch(accountsUrl.toString());
    const accountsData = await accountsRes.json();

    if (!accountsRes.ok) {
      throw new Error(`Failed to fetch pages: ${accountsData.error?.message}`);
    }

    // Find a page with a connected Instagram account
    // We need to fetch details for each page to see if it has instagram_business_account
    const pages = accountsData.data || [];
    let connectedPage = null;
    let instagramBusinessId = null;

    for (const page of pages) {
      const pageDetailsUrl = new URL(`https://graph.facebook.com/v24.0/${page.id}`);
      pageDetailsUrl.searchParams.append('fields', 'instagram_business_account');
      pageDetailsUrl.searchParams.append('access_token', longLivedToken);

      const pageRes = await fetch(pageDetailsUrl.toString());
      const pageData = await pageRes.json();

      if (pageData.instagram_business_account) {
        connectedPage = page;
        instagramBusinessId = pageData.instagram_business_account.id;
        break; // Found one
      }
    }

    if (!connectedPage || !instagramBusinessId) {
      // Fallback: If no IG account found, return error
      return NextResponse.redirect(new URL('/settings?error=no_instagram_business_account_found', baseUrl));
    }

    // 5. Encrypt and Save
    // IMPORTANT: Use the PAGE access token (connectedPage.access_token), NOT the user token.
    // The /me/accounts endpoint returns a long-lived page token when exchanged from a long-lived user token.
    // The page token is required for /{page-id}/conversations and /{page-id}/messages.
    const pageAccessToken = connectedPage.access_token;
    if (!pageAccessToken) {
      throw new Error('Page access token not found in /me/accounts response');
    }
    const encryptedToken = encryptData(pageAccessToken);
    
    const config: InstagramConfig = {
      accessToken: encryptedToken,
      pageId: connectedPage.id,
      instagramUserId: instagramBusinessId,
      graphVersion: 'v24.0',
      isConnected: true,
      updatedAt: new Date()
    };

    await updateInstagramConfig(session.email, config);

    return NextResponse.redirect(new URL('/settings?success=true', baseUrl));

  } catch (error: any) {
    console.error('Instagram Auth Error:', error);
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(error.message)}`, baseUrl));
  }
}