import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { getSession } from '@/lib/auth';
import { getVoiceNoteStreamForMessage } from '@/lib/inboxRepository';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await context.params;
    const audio = await getVoiceNoteStreamForMessage(messageId, session.email);
    if (!audio) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const webStream = Readable.toWeb(audio.stream as Readable) as ReadableStream;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': audio.mimeType,
        'Content-Length': String(audio.size),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[AudioStreamAPI] Failed to stream voice note:', error);
    return NextResponse.json({ error: 'Failed to stream audio' }, { status: 500 });
  }
}
