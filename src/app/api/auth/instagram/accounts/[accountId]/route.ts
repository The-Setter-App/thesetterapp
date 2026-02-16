import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { disconnectInstagramAccount } from '@/lib/userRepository';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ accountId: string }> }
) {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { accountId } = await context.params;
  const removed = await disconnectInstagramAccount(session.email, accountId);
  if (!removed) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> }
) {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: 'APP_URL is not configured' }, { status: 500 });
  }

  const response = await DELETE(request, context);
  if (!response.ok) {
    const payload = await response.json();
    const error = payload?.error || 'disconnect_failed';
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(error)}`, appUrl));
  }
  return NextResponse.redirect(new URL('/settings?success=disconnected', appUrl));
}
