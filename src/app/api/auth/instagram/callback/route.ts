import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { upsertInstagramAccounts } from '@/lib/userRepository';
import { encryptData } from '@/lib/crypto';
import { InstagramAccountConnection } from '@/types/auth';
import { randomUUID } from 'crypto';
import { REQUIRED_INSTAGRAM_SCOPES } from '@/lib/instagramPermissions';
import { syncInboxForAccounts } from '@/lib/inboxSync';

export const dynamic = 'force-dynamic';

async function subscribePageToWebhooks(pageId: string, pageAccessToken: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const subscribeUrl = new URL(`https://graph.facebook.com/v24.0/${pageId}/subscribed_apps`);
    subscribeUrl.searchParams.append('subscribed_fields', 'messages,messaging_postbacks,messaging_optins,messaging_handovers');
    subscribeUrl.searchParams.append('access_token', pageAccessToken);

    const res = await fetch(subscribeUrl.toString(), { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, reason: data?.error?.message || 'subscribe_failed' };
    }

    if (data?.success !== true) {
      return { ok: false, reason: 'subscribe_response_not_success' };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'subscribe_exception' };
  }
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.APP_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: 'APP_URL is not configured' }, { status: 500 });
  }

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

    // 4. Validate required permissions were granted (fail hard on missing scopes).
    const permissionsUrl = new URL('https://graph.facebook.com/v24.0/me/permissions');
    permissionsUrl.searchParams.append('access_token', longLivedToken);
    const permissionsRes = await fetch(permissionsUrl.toString());
    const permissionsData = await permissionsRes.json();
    if (!permissionsRes.ok) {
      throw new Error(`Failed to fetch granted permissions: ${permissionsData?.error?.message || 'unknown_error'}`);
    }

    const granted = new Set(
      (permissionsData?.data || [])
        .filter((p: { permission?: string; status?: string }) => p?.status === 'granted' && typeof p?.permission === 'string')
        .map((p: { permission: string }) => p.permission)
    );
    const missingScopes = REQUIRED_INSTAGRAM_SCOPES.filter((scope) => !granted.has(scope));
    if (missingScopes.length > 0) {
      return NextResponse.redirect(
        new URL(
          `/settings?error=missing_required_scopes&missing=${encodeURIComponent(missingScopes.join(','))}`,
          baseUrl
        )
      );
    }

    // 5. Get User's Pages
    const accountsUrl = new URL('https://graph.facebook.com/v24.0/me/accounts');
    accountsUrl.searchParams.append('access_token', longLivedToken);
    
    const accountsRes = await fetch(accountsUrl.toString());
    const accountsData = await accountsRes.json();

    if (!accountsRes.ok) {
      throw new Error(`Failed to fetch pages: ${accountsData.error?.message}`);
    }

    // Collect all pages with a connected Instagram business account.
    const pages = accountsData.data || [];
    const now = new Date();
    const accountConnections: InstagramAccountConnection[] = [];
    const diagnostics: Array<{
      pageId: string;
      pageName?: string;
      status:
        | 'connected'
        | 'connected_webhook_subscribed'
        | 'connected_webhook_subscribe_failed'
        | 'missing_instagram_business_account'
        | 'missing_page_access_token'
        | 'page_details_fetch_failed';
      reason?: string;
      instagramBusinessId?: string;
      instagramUsername?: string;
    }> = [];

    for (const page of pages) {
      const pageDetailsUrl = new URL(`https://graph.facebook.com/v24.0/${page.id}`);
      pageDetailsUrl.searchParams.append('fields', 'instagram_business_account{id,username}');
      pageDetailsUrl.searchParams.append('access_token', longLivedToken);

      const pageRes = await fetch(pageDetailsUrl.toString());
      const pageData = await pageRes.json();

      if (!pageRes.ok) {
        diagnostics.push({
          pageId: page.id,
          pageName: page.name,
          status: 'page_details_fetch_failed',
          reason: pageData?.error?.message || 'unknown_page_details_error',
        });
        continue;
      }

      const instagramBusinessId = pageData?.instagram_business_account?.id as string | undefined;
      if (!instagramBusinessId) {
        diagnostics.push({
          pageId: page.id,
          pageName: page.name,
          status: 'missing_instagram_business_account',
        });
        continue;
      }

      const pageAccessToken = page?.access_token as string | undefined;
      if (!pageAccessToken) {
        diagnostics.push({
          pageId: page.id,
          pageName: page.name,
          status: 'missing_page_access_token',
          instagramBusinessId,
          instagramUsername: pageData?.instagram_business_account?.username,
        });
        continue;
      }

      const encryptedToken = encryptData(pageAccessToken);

      const subscribeResult = await subscribePageToWebhooks(page.id, pageAccessToken);
      accountConnections.push({
        accountId: randomUUID(),
        accessToken: encryptedToken,
        pageId: page.id,
        instagramUserId: instagramBusinessId,
        graphVersion: 'v24.0',
        isConnected: true,
        connectedAt: now,
        updatedAt: now,
        pageName: page.name,
        instagramUsername: pageData?.instagram_business_account?.username,
      });
      diagnostics.push({
        pageId: page.id,
        pageName: page.name,
        status: subscribeResult.ok ? 'connected_webhook_subscribed' : 'connected_webhook_subscribe_failed',
        instagramBusinessId,
        instagramUsername: pageData?.instagram_business_account?.username,
        reason: subscribeResult.reason,
      });
    }

    console.log(
      '[Instagram OAuth] Page diagnostics:',
      diagnostics.map((d) => ({
        pageId: d.pageId,
        pageName: d.pageName,
        status: d.status,
        instagramBusinessId: d.instagramBusinessId,
        instagramUsername: d.instagramUsername,
        reason: d.reason,
      }))
    );

    if (accountConnections.length === 0) {
      const summary = diagnostics.map((d) => `${d.pageId}:${d.status}`).join(',');
      const reason = summary || 'no_pages_returned';
      return NextResponse.redirect(
        new URL(`/settings?error=no_instagram_business_account_found&reason=${encodeURIComponent(reason)}`, baseUrl)
      );
    }

    await upsertInstagramAccounts(session.email, accountConnections);
    const syncResult = await syncInboxForAccounts(session.email, accountConnections);
    console.log(
      `[Instagram OAuth] Initial inbox sync completed: conversations=${syncResult.syncedConversations}, messages=${syncResult.syncedMessages}`
    );
    const failedSubscriptions = diagnostics.filter((d) => d.status === 'connected_webhook_subscribe_failed');
    const warning = failedSubscriptions.length > 0 ? `webhook_subscribe_failed_${failedSubscriptions.length}` : '';
    const successUrl = warning
      ? `/settings?success=true&connectedCount=${accountConnections.length}&warning=${encodeURIComponent(warning)}`
      : `/settings?success=true&connectedCount=${accountConnections.length}`;
    return NextResponse.redirect(new URL(successUrl, baseUrl));

  } catch (error: any) {
    console.error('Instagram Auth Error:', error);
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(error.message)}`, baseUrl));
  }
}
