import { NextRequest, NextResponse } from 'next/server';
import { sendAttachmentMessage } from '@/lib/graphApi';
import { getInstagramAccountById } from '@/lib/userRepository';
import { decryptData } from '@/lib/crypto';
import { syncLatestMessages } from '@/app/actions/inbox';
import { findConversationById, saveOrUpdateLocalAudioMessage, saveVoiceNoteBlobToGridFs, updateConversationMetadata } from '@/lib/inboxRepository';
import { getRelativeTime } from '@/lib/mappers';
import { emitWorkspaceSseEvent } from '../sse/route';
import { AccessError, requireInboxWorkspaceContext } from '@/lib/workspace';

export async function POST(request: NextRequest) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversationId') as string | null;
    const attachmentType = (formData.get('type') as string) || 'image';
    const clientTempId = (formData.get('clientTempId') as string | null) || undefined;
    const duration = (formData.get('duration') as string | null) || undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!conversationId) {
      return NextResponse.json({ error: 'No conversationId provided' }, { status: 400 });
    }

    const conversation = await findConversationById(conversationId, workspaceOwnerEmail);
    if (!conversation?.recipientId || !conversation.accountId) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const account = await getInstagramAccountById(workspaceOwnerEmail, conversation.accountId);
    if (!account?.instagramUserId) {
      return NextResponse.json({ error: 'No Instagram connection' }, { status: 400 });
    }

    const accessToken = decryptData(account.accessToken);

    await sendAttachmentMessage(
      account.pageId,
      conversation.recipientId,
      file,
      attachmentType as 'image' | 'audio' | 'video' | 'file',
      accessToken,
      account.graphVersion
    );

    if (attachmentType === 'audio') {
      if (!clientTempId) {
        return NextResponse.json({ error: 'clientTempId is required for audio' }, { status: 400 });
      }

      const localMessageId = `local_audio_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const timestampIso = new Date().toISOString();
      const bytes = Buffer.from(await file.arrayBuffer());

      const audioStorage = await saveVoiceNoteBlobToGridFs({
        ownerEmail: workspaceOwnerEmail,
        conversationId: conversation.id,
        recipientId: conversation.recipientId,
        messageId: localMessageId,
        fileName: file.name || `voice_note_${Date.now()}.webm`,
        mimeType: file.type || 'audio/webm',
        bytes,
      });

      const savedMessage = await saveOrUpdateLocalAudioMessage({
        ownerEmail: workspaceOwnerEmail,
        conversationId: conversation.id,
        recipientId: conversation.recipientId,
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
        workspaceOwnerEmail,
        'You sent a voice message',
        getRelativeTime(savedMessage.timestamp || timestampIso),
        false,
        true,
        savedMessage.timestamp || timestampIso
      );

      const eventTimestampMs = Date.parse(savedMessage.timestamp || timestampIso);
      emitWorkspaceSseEvent(workspaceOwnerEmail, {
        type: 'message_echo',
        timestamp: new Date().toISOString(),
        data: {
          senderId: account.instagramUserId,
          recipientId: conversation.recipientId,
          conversationId: conversation.id,
          accountId: conversation.accountId,
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
          timestamp: Number.isFinite(eventTimestampMs) ? eventTimestampMs : Date.now(),
          fromMe: true,
        },
      });

      emitWorkspaceSseEvent(workspaceOwnerEmail, {
        type: 'messages_synced',
        timestamp: new Date().toISOString(),
        data: {
          conversationId: conversation.id,
          recipientId: conversation.recipientId,
        },
      });

      return NextResponse.json({ success: true, messageId: savedMessage.id });
    }

    // Sync latest messages to get the real ID and URL, and emit SSE to frontend
    // This allows the frontend to replace the optimistic blob URL with the real one
    // Pass matchCriteria to ensure we find the image message even if a text message was sent immediately after
    syncLatestMessages(conversation.id, { type: attachmentType }).catch(err =>
      console.warn('[SendAttachment] Background sync failed:', err)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[SendAttachment] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
