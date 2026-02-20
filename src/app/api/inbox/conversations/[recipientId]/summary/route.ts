import { NextRequest, NextResponse } from 'next/server';
import {
  findConversationById,
  getConversationSummary,
  getMessagesPageFromDb,
  updateConversationSummary,
} from '@/lib/inboxRepository';
import { generateConversationSummary } from '@/lib/inboxSummary';
import type { ConversationSummaryResponse } from '@/types/inbox';
import { AccessError, requireInboxWorkspaceContext } from '@/lib/workspace';

const SUMMARY_MESSAGE_LIMIT = 60;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ recipientId: string }> }
) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
    const { recipientId: conversationId } = await context.params;

    if (!conversationId?.trim()) {
      return NextResponse.json({ error: 'Conversation id is required.' }, { status: 400 });
    }

    const conversation = await findConversationById(conversationId, workspaceOwnerEmail);
    if (!conversation?.id) {
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
    }

    const cachedSummary = await getConversationSummary(conversation.id, workspaceOwnerEmail);
    const payload: ConversationSummaryResponse = {
      summary: cachedSummary,
      source: cachedSummary ? 'cache' : 'none',
    };
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[InboxSummaryAPI] Failed to fetch summary:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation summary.' }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ recipientId: string }> }
) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
    const { recipientId: conversationId } = await context.params;

    if (!conversationId?.trim()) {
      return NextResponse.json({ error: 'Conversation id is required.' }, { status: 400 });
    }

    const conversation = await findConversationById(conversationId, workspaceOwnerEmail);
    if (!conversation?.id) {
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
    }

    const page = await getMessagesPageFromDb(conversation.id, workspaceOwnerEmail, SUMMARY_MESSAGE_LIMIT);
    const generatedSummary = await generateConversationSummary(page.messages);
    const storedSummary = await updateConversationSummary(conversation.id, workspaceOwnerEmail, generatedSummary);

    const payload: ConversationSummaryResponse = {
      summary: storedSummary,
      source: 'generated',
    };
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[InboxSummaryAPI] Failed to generate summary:', error);
    return NextResponse.json({ error: 'Failed to generate conversation summary.' }, { status: 500 });
  }
}
