import { NextRequest, NextResponse } from 'next/server';
import { sendAttachmentMessage } from '@/lib/graphApi';
import { getUserCredentials } from '@/lib/userRepository';
import { decryptData } from '@/lib/crypto';
import { getSession } from '@/lib/auth';
import { syncLatestMessages } from '@/app/actions/inbox';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const recipientId = formData.get('recipientId') as string | null;
    const attachmentType = (formData.get('type') as string) || 'image';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!recipientId) {
      return NextResponse.json({ error: 'No recipientId provided' }, { status: 400 });
    }

    const creds = await getUserCredentials(session.email);
    if (!creds?.instagramUserId) {
      return NextResponse.json({ error: 'No Instagram connection' }, { status: 400 });
    }

    const accessToken = decryptData(creds.accessToken);

    await sendAttachmentMessage(
      creds.pageId,
      recipientId,
      file,
      attachmentType as 'image' | 'audio' | 'video' | 'file',
      accessToken,
      creds.graphVersion
    );

    // Sync latest messages to get the real ID and URL, and emit SSE to frontend
    // This allows the frontend to replace the optimistic blob URL with the real one
    // Pass matchCriteria to ensure we find the image message even if a text message was sent immediately after
    syncLatestMessages(recipientId, { type: attachmentType }).catch(err => 
      console.warn('[SendAttachment] Background sync failed:', err)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SendAttachment] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}