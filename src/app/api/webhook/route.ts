import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sseEmitter } from '../sse/route';
import { 
  findConversationIdByParticipantAndAccount,
  findConversationIdByParticipantUnique,
  saveMessageToDb, 
  updateConversationMetadata, 
  saveConversationsToDb,
  updateUserAvatar
} from '@/lib/inboxRepository';
import { fetchAllConversations, fetchUserProfile } from '@/lib/graphApi';
import { mapConversationToUser, getRelativeTime } from '@/lib/mappers';
import { getUserByInstagramId } from '@/lib/userRepository';
import { decryptData } from '@/lib/crypto';
import type { SSEEvent, SSEAttachment, Message } from '@/types/inbox';

/**
 * Facebook Webhook Endpoint
 * Handles verification and incoming Instagram messages
 */

const VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN || 'your_verify_token_here';
const APP_SECRET = process.env.FB_APP_SECRET || '';
const WEBHOOK_DEBUG = process.env.WEBHOOK_DEBUG === 'true';

function webhookDebug(...args: unknown[]) {
  if (WEBHOOK_DEBUG) {
    console.log(...args);
  }
}

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
      webhookDebug('[Webhook] Verification successful');
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
      webhookDebug('[Webhook] Instagram event received');
      
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
  recipientId: string,
  instagramUserId: string,
  ownerEmail: string
): Promise<string | undefined> {
  try {
    const participantId = senderId === instagramUserId ? recipientId : senderId;
    const scoped = await findConversationIdByParticipantAndAccount(participantId, ownerEmail, instagramUserId);
    if (scoped) return scoped;
    return await findConversationIdByParticipantUnique(participantId, ownerEmail);
  } catch {
    return undefined;
  }
}

function normalizeWebhookAttachments(attachments?: unknown[]): {
  normalized: SSEAttachment[];
  messageType: Message['type'];
  attachmentUrl?: string;
} {
  if (!attachments?.length) {
    return { normalized: [], messageType: 'text' };
  }

  const normalized: SSEAttachment[] = [];
  let messageType: Message['type'] = 'text';
  let attachmentUrl: string | undefined;

  for (const raw of attachments) {
    const att = raw as {
      type?: string;
      payload?: { url?: string };
      image_data?: { url: string; width?: number; height?: number };
      video_data?: { url: string; width?: number; height?: number };
      file_url?: string;
    };

    const url = att.payload?.url || att.image_data?.url || att.video_data?.url || att.file_url;
    const attType = att.type;

    if (att.image_data?.url || attType === 'image') {
      const imageUrl = att.image_data?.url || url;
      if (imageUrl) {
        normalized.push({
          type: 'image',
          image_data: { url: imageUrl, width: att.image_data?.width || 0, height: att.image_data?.height || 0 },
          payload: { url: imageUrl },
        });
        if (!attachmentUrl) {
          attachmentUrl = imageUrl;
          messageType = 'image';
        }
      }
      continue;
    }

    if (att.video_data?.url || attType === 'video') {
      const videoUrl = att.video_data?.url || url;
      if (videoUrl) {
        normalized.push({
          type: 'video',
          video_data: { url: videoUrl, width: att.video_data?.width || 0, height: att.video_data?.height || 0 },
          payload: { url: videoUrl },
        });
        if (!attachmentUrl) {
          attachmentUrl = videoUrl;
          messageType = 'video';
        }
      }
      continue;
    }

    if (url) {
      const isAudio = attType === 'audio' || url.includes('audio') || url.endsWith('.mp3') || url.endsWith('.m4a') || url.endsWith('.ogg');
      normalized.push({
        type: isAudio ? 'audio' : 'file',
        file_url: url,
        payload: { url },
      });
      if (!attachmentUrl) {
        attachmentUrl = url;
        messageType = isAudio ? 'audio' : 'file';
      }
    }
  }

  return { normalized, messageType, attachmentUrl };
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
  
  // Determine which ID belongs to our user (the business account)
  // In a webhook event, one ID is the sender and one is the recipient.
  // We need to check which one matches a connected Instagram account in our DB.
  
  // First, check if the recipient is our user (Incoming message)
  let identity = await getUserByInstagramId(recipient.id);
  let instagramUserId = recipient.id;

  // If not, check if the sender is our user (Outgoing message / Echo)
  if (!identity) {
    identity = await getUserByInstagramId(sender.id);
    instagramUserId = sender.id;
  }

  if (!identity) {
    console.warn(`[Webhook] No user found for participant IDs: ${sender.id}, ${recipient.id}. Ignoring.`);
    return;
  }

  const owner = identity.user;
  const creds = identity.account;
  const ownerEmail = owner.email; // Extracted email for isolation
  const senderId = sender.id;
  const recipientId = recipient.id;
  const timestamp = event.timestamp as number;

  webhookDebug(`[Webhook] Message event from ${senderId} to ${recipientId} (Owner: ${ownerEmail})`);

  // Derive fromMe: the sender is our page/IG user
  const fromMe = senderId === instagramUserId;

  // Resolve the conversationId
  let conversationId = await resolveConversationId(senderId, recipientId, instagramUserId, ownerEmail);

  // If conversation not found in DB, try to fetch fresh list from Graph API
  // This handles the case where a new lead messages while the app was offline
  if (!conversationId) {
    webhookDebug('[Webhook] Conversation ID not found in DB. Fetching fresh list from Graph API...');
    try {
      const accessToken = decryptData(creds.accessToken);
      const rawConvs = await fetchAllConversations(creds.pageId, accessToken, {
        pageLimit: 50,
        maxPages: 20,
        graphVersion: creds.graphVersion,
      });
      const users = rawConvs.data.map((c) =>
        mapConversationToUser(c, instagramUserId, {
          accountId: creds.accountId,
          ownerPageId: creds.pageId,
          accountLabel: creds.instagramUsername || creds.pageName,
        })
      );
      await saveConversationsToDb(users, ownerEmail);
      
      // Retry resolving after refresh
      conversationId = await resolveConversationId(senderId, recipientId, instagramUserId, ownerEmail);
      if (conversationId) {
        webhookDebug(`[Webhook] Successfully resolved conversation ID ${conversationId} after refresh`);
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

    const { normalized: sseAttachments, messageType, attachmentUrl } = normalizeWebhookAttachments(attachments);

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
      
      await saveMessageToDb(newMessage, conversationId, ownerEmail);
      webhookDebug(`[Webhook] Persisted message ${messageId} to MongoDB`);

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
        // For outgoing messages, clear "waiting for reply" count for this conversation.
        const clearUnread = fromMe || isEcho;

        await updateConversationMetadata(
          conversationId,
          ownerEmail,
          previewText,
          timeStr,
          incrementUnread,
          clearUnread,
          new Date(timestamp).toISOString()
        );
        webhookDebug(`[Webhook] Updated metadata for conversation ${conversationId}`);

        // Fetch and update profile picture for incoming messages
        if (!fromMe && !isEcho) {
          try {
            const accessToken = decryptData(creds.accessToken);
            // Fetch profile pic for the sender (who is the external user)
            const profilePic = await fetchUserProfile(senderId, accessToken, creds.graphVersion);
            
            if (profilePic) {
              await updateUserAvatar(conversationId, ownerEmail, profilePic);
              webhookDebug(`[Webhook] Updated avatar for ${senderId}`);
            }
          } catch (err) {
            console.error(`[Webhook] Failed to update avatar for ${senderId}:`, err);
          }
        }
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
        conversationId: conversationId || '',
        accountId: creds.accountId,
        messageId,
        text: messageText,
        attachments: sseAttachments,
        timestamp,
        fromMe: isEcho ? true : fromMe,
      },
    };

    if (isEcho) {
      webhookDebug(`[Webhook] Message echo (sent): ${messageText || '[attachment]'}`);
    } else {
      webhookDebug(`[Webhook] Message received: ${messageText || '[attachment]'}`);
    }

    sseEmitter.emit('message', ssePayload);
  }

  // Handle message seen (read receipts)
  if (event.message_seen) {
    webhookDebug('[Webhook] Message seen event');

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
    webhookDebug('[Webhook] Message delivery event');
  }
}

/**
 * Handle change events (reactions, deletions, etc.)
 */
async function handleChange(change: any) {
  webhookDebug('[Webhook] Change event:', change.field);
  
  // Handle different types of changes
  switch (change.field) {
    case 'messages':
      webhookDebug('[Webhook] Message change detected');
      break;
    case 'message_reactions':
      webhookDebug('[Webhook] Message reaction detected');
      break;
    default:
      webhookDebug('[Webhook] Unknown change type:', change.field);
  }
}
