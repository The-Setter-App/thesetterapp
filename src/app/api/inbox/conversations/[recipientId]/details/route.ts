import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getConversationDetails, updateConversationDetails } from '@/lib/inboxRepository';
import type { ConversationDetails } from '@/types/inbox';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-() ]+$/;

function hasValidPhoneDigits(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 16;
}

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
        timelineEvents: [],
        contactDetails: {
          phoneNumber: '',
          email: '',
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

    if (typeof body.notes === 'string' && body.notes.length > 4000) {
      return NextResponse.json({ error: 'Notes too long' }, { status: 400 });
    }

    if (body.contactDetails) {
      const { email, phoneNumber } = body.contactDetails;
      if (typeof email === 'string' && email.trim().length > 0 && !EMAIL_REGEX.test(email.trim())) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
      if (
        typeof phoneNumber === 'string' &&
        phoneNumber.trim().length > 0 &&
        (!PHONE_REGEX.test(phoneNumber.trim()) || !hasValidPhoneDigits(phoneNumber))
      ) {
        return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
      }
    }

    if (body.paymentDetails) {
      const { amount } = body.paymentDetails;
      if (typeof amount === 'string' && amount.trim().length > 0) {
        const numeric = Number.parseFloat(amount.replace(/[^0-9.]/g, ''));
        if (!Number.isFinite(numeric)) {
          return NextResponse.json({ error: 'Amount must be numeric' }, { status: 400 });
        }
      }
    }

    if (body.timelineEvents && !Array.isArray(body.timelineEvents)) {
      return NextResponse.json({ error: 'Timeline events must be an array' }, { status: 400 });
    }

    await updateConversationDetails(recipientId, session.email, body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[InboxDetailsAPI] Failed to update details:', error);
    return NextResponse.json({ error: 'Failed to update details' }, { status: 500 });
  }
}
