import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sseEmitter } from '../sse/route';
import { 
  findConversationIdByParticipant, 
  saveMessageToDb, 
  updateConversationMetadata, 
  saveConversationsToDb 
} from '@/lib/inboxRepository';
import { fetchConversations } from '@/lib/graphApi';
import { mapConversationToUser, getRelativeTime } from '@/lib/mappers';
import type { SSEEvent, SSEAttachment, Message } from '@/types/inbox';

/**
 * Facebook Webhook Endpoint
 * Handles verification and incoming Instagram messages
 */

const VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN || 'your_verify_token_here';
const APP_SECRET = process.env.FB_APP_SECRET || '';
const FB_USER_ID = process.env.FB_USER_ID || '';

/**
 * GET handler - Webhook verification
 * Facebook will send a GET request to verify the webhook
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      console.log('[Webhook] Verification successful');
      return new NextResponse(challenge, { status: 200 });
    }
    
    // Responds with '403 Forbidden' if verify tokens do not match
    console.error('[Webhook] Verification failed - token mismatch');
    return new NextResponse('Forbidden', { status: 403 });
  }

  return new NextResponse('Bad Request', { status: 400 });
}

/**
 * POST handler - Receive webhook events
 * Facebook sends POST requests when events occur
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify request signature
    if (!verifySignature(body, signature)) {
      console.error('[Webhook] Invalid signature');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const data = JSON.parse(body);

    // Process webhook event
    if (data.object === 'instagram') {
      console.log('[Webhook] Instagram event received');
      
      for (const entry of data.entry) {
        // Handle messaging events
        if (entry.messaging) {
          for (const event of entry.messaging) {
            await handleMessagingEvent(event);
          }
        }
        
        // Handle changes (e.g., message reactions, deletions)
        if (entry.changes) {
          for (const change of entry.changes) {
            await handleChange(change);
          }
        }
      }
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Verify that the request signature matches the expected signature
 */
function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature || !APP_SECRET) {
    return false;
  }

  // Remove 'sha256=' prefix
  const signatureHash = signature.replace('sha256=', '');
  
  // Calculate expected signature
  const expectedHash = crypto
    .createHmac('sha256', APP_SECRET)
    .update(payload)
    .digest('hex');

  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(signatureHash),
    Buffer.from(expectedHash)
  );
}

/**
 * Look up the conversation ID from MongoDB.
 */
async function resolveConversationId(
  senderId: string,
  recipientId: string
): Promise<string | undefined> {
  try {
    const participantId = senderId === FB_USER_ID ? recipientId : senderId;
    return await findConversationIdByParticipant(participantId);
  } catch {
    return undefined;
  }
}

/**
 * Handle incoming messaging events.
 *
 * Enriches every SSE payload with:
 *  - `conversationId` — resolved from MongoDB
 *  - `fromMe` — true when the sender is our page / IG account
 *
 * Persists the message to MongoDB immediately.
 */
async function handleMessagingEvent(event: Record<string, unknown>) {
  const sender = event.sender as { id: string };
  const recipient = event.recipient as { id: string };
  const senderId = sender.id;
  const recipientId = recipient.id;
  const timestamp = event.timestamp as number;

  console.log(`[Webhook] Message event from ${senderId} to ${recipientId}`);

  // Derive fromMe: the sender is our page/IG user
  const fromMe = senderId === FB_USER_ID;

  // Resolve the conversationId
  let conversationId = await resolveConversationId(senderId, recipientId);

  // If conversation not found in DB, try to fetch fresh list from Graph API
  // This handles the case where a new lead messages while the app was offline
  if (!conversationId) {
    console.log('[Webhook] Conversation ID not found in DB. Fetching fresh list from Graph API...');
    try {
      const rawConvs = await fetchConversations();
      const users = rawConvs.data.map(c => mapConversationToUser(c));
      await saveConversationsToDb(users);
      
      // Retry resolving after refresh
      conversationId = await resolveConversationId(senderId, recipientId);
      if (conversationId) {
        console.log(`[Webhook] Successfully resolved conversation ID ${conversationId} after refresh`);
      } else {
        console.warn('[Webhook] Still could not resolve conversation ID after refresh');
      }
    } catch (err) {
      console.error('[Webhook] Failed to refresh conversations:', err);
    }
  }

  // Handle message
  if (event.message) {
    const msg = event.message as {
      mid: string;
      text?: string;
      attachments?: unknown[];
      is_echo?: boolean;
    };
    const messageId = msg.mid;
    const messageText = msg.text;
    const attachments = msg.attachments;
    const isEcho = Boolean(msg.is_echo);

    // Determine message type and attachment URL
    let messageType: Message['type'] = 'text';
    let attachmentUrl: string | undefined;

    const sseAttachments = attachments as SSEAttachment[] | undefined;
    if (sseAttachments && sseAttachments.length > 0) {
      const att = sseAttachments[0];
      if (att.image_data) {
        messageType = 'image';
        attachmentUrl = att.image_data.url;
      } else if (att.video_data) {
        messageType = 'video';
        attachmentUrl = att.video_data.url;
      } else if (att.file_url) {
        // Check if it's an audio file by URL pattern (Facebook audio attachments)
        if (att.file_url.includes('audio') || att.file_url.endsWith('.mp3') || att.file_url.endsWith('.m4a') || att.file_url.endsWith('.ogg')) {
          messageType = 'audio';
        } else {
          messageType = 'file';
        }
        attachmentUrl = att.file_url;
      }
    }

    // Persist to MongoDB if conversation is known
    if (conversationId) {
      const newMessage: Message = {
        id: messageId,
        fromMe: isEcho ? true : fromMe,
        type: messageType,
        text: messageText || '',
        timestamp: new Date(timestamp).toISOString(),
        attachmentUrl,
      };
      
      await saveMessageToDb(newMessage, conversationId);
      console.log(`[Webhook] Persisted message ${messageId} to MongoDB`);

      // Update Conversation Metadata (Last Message, Time, Unread)
      // This ensures the sidebar is up-to-date in the DB immediately
      try {
        const timeStr = getRelativeTime(new Date(timestamp).toISOString());
        let previewText = messageText;
        
        if (!previewText) {
          if (messageType === 'image') previewText = 'Sent an image';
          else if (messageType === 'video') previewText = 'Sent a video';
          else if (messageType === 'audio') previewText = 'Sent an audio message';
          else if (messageType === 'file') previewText = 'Sent a file';
          else previewText = 'Sent a message';
        }

        // Only increment unread count for incoming messages (not from me, not echos)
        const incrementUnread = !fromMe && !isEcho;

        await updateConversationMetadata(
          conversationId,
          previewText,
          timeStr,
          incrementUnread
        );
        console.log(`[Webhook] Updated metadata for conversation ${conversationId}`);
      } catch (err) {
        console.error('[Webhook] Failed to update conversation metadata:', err);
      }
    } else {
      console.warn('[Webhook] Could not persist message: Conversation ID not found');
    }

    const ssePayload: SSEEvent = {
      type: isEcho ? 'message_echo' : 'new_message',
      timestamp: new Date().toISOString(),
      data: {
        senderId,
        recipientId,
        messageId,
        text: messageText,
        attachments: sseAttachments,
        timestamp,
        conversationId,
        fromMe: isEcho ? true : fromMe,
      },
    };

    if (isEcho) {
      console.log(`[Webhook] Message echo (sent): ${messageText || '[attachment]'}`);
    } else {
      console.log(`[Webhook] Message received: ${messageText || '[attachment]'}`);
    }

    sseEmitter.emit('message', ssePayload);
  }

  // Handle message seen (read receipts)
  if (event.message_seen) {
    console.log('[Webhook] Message seen event');

    const seenPayload: SSEEvent = {
      type: 'message_seen',
      timestamp: new Date().toISOString(),
      data: {
        senderId,
        recipientId,
        timestamp,
      },
    };

    sseEmitter.emit('message', seenPayload);
  }

  // Handle message delivery
  if (event.delivery) {
    console.log('[Webhook] Message delivery event');
  }
}

/**
 * Handle change events (reactions, deletions, etc.)
 */
async function handleChange(change: any) {
  console.log('[Webhook] Change event:', change.field);
  
  // Handle different types of changes
  switch (change.field) {
    case 'messages':
      console.log('[Webhook] Message change detected');
      break;
    case 'message_reactions':
      console.log('[Webhook] Message reaction detected');
      break;
    default:
      console.log('[Webhook] Unknown change type:', change.field);
  }
}