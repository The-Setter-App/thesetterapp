import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { findConversationByRecipientId, getMessagesPageFromDb, saveMessagesToDb } from '@/lib/inboxRepository';
import { getUserCredentials } from '@/lib/userRepository';
import { decryptData } from '@/lib/crypto';
import { fetchMessages } from '@/lib/graphApi';
import { mapGraphMessageToAppMessage } from '@/lib/mappers';

const DEFAULT_INITIAL_LIMIT = 20;
const MAX_PAGE_LIMIT = 20;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ recipientId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientId } = await context.params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const requestedLimit = Number(searchParams.get('limit'));
    const parsedLimit = Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_INITIAL_LIMIT;
    const limit = Math.min(Math.max(parsedLimit, 1), MAX_PAGE_LIMIT);

    const conversation = await findConversationByRecipientId(recipientId, session.email);
    if (!conversation?.id) {
      return NextResponse.json({
        messages: [],
        nextCursor: null,
        hasMore: false,
        source: 'mongo',
      });
    }

    let page = await getMessagesPageFromDb(conversation.id, session.email, limit, cursor);

    // Guardrail: if Mongo has no messages for this conversation, fetch latest 20 from Graph and persist.
    if (!cursor && page.messages.length === 0) {
      const creds = await getUserCredentials(session.email);
      if (creds?.instagramUserId) {
        const accessToken = decryptData(creds.accessToken);
        const rawMessages = await fetchMessages(conversation.id, accessToken, 20, creds.graphVersion);
        const mapped = rawMessages.map((msg) => mapGraphMessageToAppMessage(msg, creds.instagramUserId));
        await saveMessagesToDb(mapped, conversation.id, session.email);
        page = await getMessagesPageFromDb(conversation.id, session.email, limit, cursor);
      }
    }

    return NextResponse.json({
      messages: page.messages,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      source: 'mongo',
    });
  } catch (error) {
    console.error('[InboxMessagesAPI] Failed to fetch messages page:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
