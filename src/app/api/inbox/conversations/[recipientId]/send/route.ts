import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserCredentials } from '@/lib/userRepository';
import { decryptData } from '@/lib/crypto';
import { sendMessage } from '@/lib/graphApi';
import { syncLatestMessages } from '@/app/actions/inbox';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ recipientId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientId } = await context.params;
    const body = (await request.json()) as { text?: string; clientTempId?: string };
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const creds = await getUserCredentials(session.email);
    if (!creds?.instagramUserId) {
      return NextResponse.json({ error: 'No active Instagram connection found' }, { status: 400 });
    }

    const accessToken = decryptData(creds.accessToken);
    await sendMessage(creds.pageId, recipientId, text, accessToken, creds.graphVersion);

    syncLatestMessages(recipientId, { text }).catch((err) => {
      console.warn('[InboxSendAPI] Background sync failed:', err);
    });

    return NextResponse.json({ accepted: true, clientTempId: body.clientTempId || null });
  } catch (error) {
    console.error('[InboxSendAPI] Failed to send message:', error);
    const message = error instanceof Error ? error.message : 'Failed to send';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
