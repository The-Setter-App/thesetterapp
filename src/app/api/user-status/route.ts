import { NextRequest } from 'next/server';
import { findConversationByRecipientId } from '@/lib/inboxRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const recipientId = searchParams.get('recipientId');
  if (!recipientId) {
    return new Response(JSON.stringify({ error: 'Missing recipientId' }), { status: 400 });
  }
  const user = await findConversationByRecipientId(recipientId);
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }
  return new Response(JSON.stringify({ status: user.status }), { status: 200 });
}
