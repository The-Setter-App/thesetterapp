import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getInstagramAccountById } from '@/lib/userRepository';
import { decryptData } from '@/lib/crypto';
import { sendMessage } from '@/lib/graphApi';
import { syncLatestMessages } from '@/app/actions/inbox';
import { findConversationById } from '@/lib/inboxRepository';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ recipientId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientId: conversationId } = await context.params;
    const body = (await request.json()) as { text?: string; clientTempId?: string };
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const conversation = await findConversationById(conversationId, session.email);
    if (!conversation?.recipientId || !conversation.accountId) {
      return NextResponse.json({ error: 'No active conversation found' }, { status: 404 });
    }

    const account = await getInstagramAccountById(session.email, conversation.accountId);
    if (!account) {
      return NextResponse.json({ error: 'No active Instagram connection found' }, { status: 400 });
    }

    const accessToken = decryptData(account.accessToken);
    await sendMessage(account.pageId, conversation.recipientId, text, accessToken, account.graphVersion);

    syncLatestMessages(conversationId, { text }).catch((err) => {
      console.warn('[InboxSendAPI] Background sync failed:', err);
    });

    return NextResponse.json({ accepted: true, clientTempId: body.clientTempId || null });
  } catch (error) {
    console.error('[InboxSendAPI] Failed to send message:', error);
    const message = error instanceof Error ? error.message : 'Failed to send';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
