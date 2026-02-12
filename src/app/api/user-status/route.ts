import { NextRequest } from 'next/server';
import { findConversationByRecipientId } from '@/lib/inboxRepository';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const recipientId = searchParams.get('recipientId');
  if (!recipientId) {
    return new Response(JSON.stringify({ error: 'Missing recipientId' }), { status: 400 });
  }
  const user = await findConversationByRecipientId(recipientId, session.email);
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }
  return new Response(JSON.stringify({ status: user.status }), { status: 200 });
}
