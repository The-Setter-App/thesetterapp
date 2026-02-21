import { NextRequest, NextResponse } from 'next/server';
import { findConversationById, getMessagesPageFromDb, saveMessagesToDb } from '@/lib/inboxRepository';
import { getConnectedInstagramAccounts, getInstagramAccountById } from '@/lib/userRepository';
import { decryptData } from '@/lib/crypto';
import { fetchMessages } from '@/lib/graphApi';
import { mapGraphMessageToAppMessage } from '@/lib/mappers';
import { AccessError, requireInboxWorkspaceContext } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

const DEFAULT_INITIAL_LIMIT = 20;
const MAX_PAGE_LIMIT = 20;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ recipientId: string }> }
) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();

    const { recipientId: conversationId } = await context.params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const requestedLimit = Number(searchParams.get('limit'));
    const parsedLimit = Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_INITIAL_LIMIT;
    const limit = Math.min(Math.max(parsedLimit, 1), MAX_PAGE_LIMIT);

    const conversation = await findConversationById(conversationId, workspaceOwnerEmail);
    if (!conversation?.id) {
      return NextResponse.json({
        messages: [],
        nextCursor: null,
        hasMore: false,
        source: 'mongo',
      }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    let page = await getMessagesPageFromDb(conversation.id, workspaceOwnerEmail, limit, cursor);

    // Guardrail: if Mongo has no messages for this conversation, fetch latest 20 from Graph and persist.
    if (!cursor && page.messages.length === 0) {
      let account = conversation.accountId ? await getInstagramAccountById(workspaceOwnerEmail, conversation.accountId) : null;
      if (!account) {
        const connectedAccounts = await getConnectedInstagramAccounts(workspaceOwnerEmail);
        if (conversation.ownerInstagramUserId) {
          account =
            connectedAccounts.find((a) => a.instagramUserId === conversation.ownerInstagramUserId) || null;
        }
        if (!account && connectedAccounts.length === 1) {
          account = connectedAccounts[0];
        }
      }
      if (account?.instagramUserId) {
        const accessToken = decryptData(account.accessToken);
        const rawMessages = await fetchMessages(conversation.id, accessToken, 20, account.graphVersion);
        const mapped = rawMessages.map((msg) => mapGraphMessageToAppMessage(msg, account.instagramUserId));
        await saveMessagesToDb(mapped, conversation.id, workspaceOwnerEmail);
        page = await getMessagesPageFromDb(conversation.id, workspaceOwnerEmail, limit, cursor);
      }
    }

    return NextResponse.json({
      messages: page.messages,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      source: 'mongo',
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    }
    console.error('[InboxMessagesAPI] Failed to fetch messages page:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
