import { NextRequest, NextResponse } from 'next/server';
import { sendAttachmentMessage } from '@/lib/graphApi';
import { getUserCredentials } from '@/lib/userRepository';
import { decryptData } from '@/lib/crypto';
import { getSession } from '@/lib/auth';
import { syncLatestMessages } from '@/app/actions/inbox';
import { findConversationByRecipientId, saveOrUpdateLocalAudioMessage, saveVoiceNoteBlobToGridFs, updateConversationMetadata } from '@/lib/inboxRepository';
import { getRelativeTime } from '@/lib/mappers';
import { sseEmitter } from '../sse/route';

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
    const clientTempId = (formData.get('clientTempId') as string | null) || undefined;
    const duration = (formData.get('duration') as string | null) || undefined;

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

    if (attachmentType === 'audio') {
      if (!clientTempId) {
        return NextResponse.json({ error: 'clientTempId is required for audio' }, { status: 400 });
      }

      const conversation = await findConversationByRecipientId(recipientId, session.email);
      if (!conversation?.id) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      const localMessageId = `local_audio_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const timestampIso = new Date().toISOString();
      const bytes = Buffer.from(await file.arrayBuffer());

      const audioStorage = await saveVoiceNoteBlobToGridFs({
        ownerEmail: session.email,
        conversationId: conversation.id,
        recipientId,
        messageId: localMessageId,
        fileName: file.name || `voice_note_${Date.now()}.webm`,
        mimeType: file.type || 'audio/webm',
        bytes,
      });

      const savedMessage = await saveOrUpdateLocalAudioMessage({
        ownerEmail: session.email,
        conversationId: conversation.id,
        recipientId,
        messageId: localMessageId,
        clientTempId,
        timestamp: timestampIso,
        duration,
        audioStorage: {
          kind: 'gridfs',
          fileId: audioStorage.fileId,
          mimeType: audioStorage.mimeType,
          size: audioStorage.size,
        },
      });

      await updateConversationMetadata(
        conversation.id,
        session.email,
        'You sent a voice message',
        getRelativeTime(savedMessage.timestamp || timestampIso),
        false,
        true
      );

      sseEmitter.emit('message', {
        type: 'message_echo',
        timestamp: new Date().toISOString(),
        data: {
          senderId: creds.instagramUserId,
          recipientId,
          messageId: savedMessage.id,
          text: '',
          duration: savedMessage.duration,
          attachments: [
            {
              type: 'audio',
              file_url: savedMessage.attachmentUrl,
              payload: { url: savedMessage.attachmentUrl },
            },
          ],
          timestamp: Date.now(),
          conversationId: conversation.id,
          fromMe: true,
        },
      });

      sseEmitter.emit('message', {
        type: 'messages_synced',
        timestamp: new Date().toISOString(),
        data: {
          conversationId: conversation.id,
          recipientId,
        },
      });

      return NextResponse.json({ success: true, messageId: savedMessage.id });
    }

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
