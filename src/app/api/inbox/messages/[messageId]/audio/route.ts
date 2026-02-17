import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { getVoiceNoteStreamForMessage } from '@/lib/inboxRepository';
import { AccessError, requireInboxWorkspaceContext } from '@/lib/workspace';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();

    const { messageId } = await context.params;
    const audio = await getVoiceNoteStreamForMessage(messageId, workspaceOwnerEmail);
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
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[AudioStreamAPI] Failed to stream voice note:', error);
    return NextResponse.json({ error: 'Failed to stream audio' }, { status: 500 });
  }
}
