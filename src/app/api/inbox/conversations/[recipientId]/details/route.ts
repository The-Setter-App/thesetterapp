import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getConversationDetails, updateConversationDetails } from '@/lib/inboxRepository';
import type { ConversationDetails } from '@/types/inbox';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ recipientId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientId } = await context.params;
    const details = await getConversationDetails(recipientId, session.email);

    return NextResponse.json({
      details: details ?? {
        notes: '',
        paymentDetails: {
          amount: '',
          paymentMethod: 'Fanbasis',
          payOption: 'One Time',
          paymentFrequency: 'One Time',
          setterPaid: 'No',
          closerPaid: 'No',
          paymentNotes: '',
        },
      },
    });
  } catch (error) {
    console.error('[InboxDetailsAPI] Failed to get details:', error);
    return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ recipientId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientId } = await context.params;
    const body = (await request.json()) as Partial<ConversationDetails>;

    await updateConversationDetails(recipientId, session.email, body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[InboxDetailsAPI] Failed to update details:', error);
    return NextResponse.json({ error: 'Failed to update details' }, { status: 500 });
  }
}
