import { NextRequest } from 'next/server';
import { findConversationById } from '@/lib/inboxRepository';
import { AccessError, requireInboxWorkspaceContext } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let workspaceOwnerEmail = '';
  try {
    const context = await requireInboxWorkspaceContext();
    workspaceOwnerEmail = context.workspaceOwnerEmail;
  } catch (error) {
    if (error instanceof AccessError) {
      return new Response(JSON.stringify({ error: error.message }), { status: error.status });
    }
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');
  if (!conversationId) {
    return new Response(JSON.stringify({ error: 'Missing conversationId' }), { status: 400 });
  }
  const user = await findConversationById(conversationId, workspaceOwnerEmail);
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }
  return new Response(JSON.stringify({ status: user.status }), { status: 200 });
}
