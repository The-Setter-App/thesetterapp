import crypto from "node:crypto";
import { after, type NextRequest, NextResponse } from "next/server";
import {
  extractUsernameFromUser,
  getBlockedUsernameSet,
} from "@/lib/blockedUsernamesRepository";
import {
  incrementCommentAutomationTriggerCount,
  incrementVariantTriggerCount,
  listActiveCommentAutomations,
  listAutomationVariants,
  matchCommentAutomation,
  pickVariant,
  recordPendingCommentAutomationSend,
} from "@/lib/commentAutomationsRepository";
import { decryptData } from "@/lib/crypto";
import {
  fetchAllConversations,
  fetchUserProfile,
  sendPrivateReplyToComment,
} from "@/lib/graphApi";
import { extractLeadSourceFromWebhookMessage } from "@/lib/inbox/leadSource";
import { emitWorkspaceSseEvent } from "@/lib/inbox/sseBus";
import { maybeClassifyConversationStatus } from "@/lib/inbox/statusClassificationJob";
import {
  findConversationById,
  findConversationIdByParticipantAndAccount,
  findConversationIdByParticipantUnique,
  reconcileOutgoingAudioEchoWithLocalFallback,
  saveConversationsToDb,
  saveMessageToDb,
  updateConversationMetadata,
  updateUserAvatar,
} from "@/lib/inboxRepository";
import { getRelativeTime, mapConversationToUser } from "@/lib/mappers";
import { findWorkspaceTagByRole } from "@/lib/tagsRepository";
import { getUserByInstagramId } from "@/lib/userRepository";
import type { Message, SSEAttachment, SSEEvent } from "@/types/inbox";

/**
 * Facebook Webhook Endpoint
 * Handles verification and incoming Instagram messages
 */

const VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN?.trim() || "";
const APP_SECRET = process.env.FB_APP_SECRET?.trim() || "";
const WEBHOOK_DEBUG = process.env.WEBHOOK_DEBUG === "true";

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
  if (!VERIFY_TOKEN) {
    console.error("[Webhook] FB_WEBHOOK_VERIFY_TOKEN is not configured");
    return new NextResponse("Webhook verify token is not configured", {
      status: 500,
    });
  }

  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      webhookDebug("[Webhook] Verification successful");
      return new NextResponse(challenge, { status: 200 });
    }

    // Responds with '403 Forbidden' if verify tokens do not match
    console.error("[Webhook] Verification failed - token mismatch");
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse("Bad Request", { status: 400 });
}

/**
 * POST handler - Receive webhook events
 * Facebook sends POST requests when events occur
 */
export async function POST(request: NextRequest) {
  try {
    if (!APP_SECRET) {
      console.error("[Webhook] FB_APP_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook app secret is not configured" },
        { status: 500 },
      );
    }

    const body = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    // Verify request signature
    if (!verifySignature(body, signature)) {
      console.error("[Webhook] Invalid signature");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = JSON.parse(body);

    // Process webhook event
    if (data.object === "instagram") {
      webhookDebug("[Webhook] Instagram event received");

      for (const entry of data.entry) {
        // Handle messaging events
        if (entry.messaging) {
          for (const event of entry.messaging) {
            await handleMessagingEvent(event);
          }
        }

        // Handle changes (e.g., message reactions, deletions, comments)
        if (entry.changes) {
          for (const change of entry.changes) {
            await handleChange(change, entry.id);
          }
        }
      }
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Verify that the request signature matches the expected signature
 */
function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature || !APP_SECRET) {
    return false;
  }

  if (!signature.startsWith("sha256=")) {
    return false;
  }

  // Remove 'sha256=' prefix and validate exact SHA-256 hex shape.
  const signatureHash = signature.slice(7).trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(signatureHash)) {
    return false;
  }

  // Calculate expected signature
  const expectedHash = crypto
    .createHmac("sha256", APP_SECRET)
    .update(payload)
    .digest("hex");

  const provided = Buffer.from(signatureHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  if (provided.length !== expected.length) {
    return false;
  }

  // Compare signatures
  return crypto.timingSafeEqual(provided, expected);
}

/**
 * Look up the conversation ID from Supabase.
 */
async function resolveConversationId(
  senderId: string,
  recipientId: string,
  instagramUserId: string,
  ownerEmail: string,
): Promise<string | undefined> {
  try {
    const participantId = senderId === instagramUserId ? recipientId : senderId;
    const scoped = await findConversationIdByParticipantAndAccount(
      participantId,
      ownerEmail,
      instagramUserId,
    );
    if (scoped) return scoped;
    return await findConversationIdByParticipantUnique(
      participantId,
      ownerEmail,
    );
  } catch {
    return undefined;
  }
}

function normalizeWebhookAttachments(attachments?: unknown[]): {
  normalized: SSEAttachment[];
  messageType: Message["type"];
  attachmentUrl?: string;
} {
  if (!attachments?.length) {
    return { normalized: [], messageType: "text" };
  }

  const normalized: SSEAttachment[] = [];
  let messageType: Message["type"] = "text";
  let attachmentUrl: string | undefined;

  for (const raw of attachments) {
    const att = raw as {
      type?: string;
      payload?: { url?: string };
      image_data?: { url: string; width?: number; height?: number };
      video_data?: { url: string; width?: number; height?: number };
      file_url?: string;
    };

    const url =
      att.payload?.url ||
      att.image_data?.url ||
      att.video_data?.url ||
      att.file_url;
    const attType = att.type;

    if (att.image_data?.url || attType === "image") {
      const imageUrl = att.image_data?.url || url;
      if (imageUrl) {
        normalized.push({
          type: "image",
          image_data: {
            url: imageUrl,
            width: att.image_data?.width || 0,
            height: att.image_data?.height || 0,
          },
          payload: { url: imageUrl },
        });
        if (!attachmentUrl) {
          attachmentUrl = imageUrl;
          messageType = "image";
        }
      }
      continue;
    }

    if (att.video_data?.url || attType === "video") {
      const videoUrl = att.video_data?.url || url;
      if (videoUrl) {
        normalized.push({
          type: "video",
          video_data: {
            url: videoUrl,
            width: att.video_data?.width || 0,
            height: att.video_data?.height || 0,
          },
          payload: { url: videoUrl },
        });
        if (!attachmentUrl) {
          attachmentUrl = videoUrl;
          messageType = "video";
        }
      }
      continue;
    }

    if (url) {
      const isAudio =
        attType === "audio" ||
        url.includes("audio") ||
        url.endsWith(".mp3") ||
        url.endsWith(".m4a") ||
        url.endsWith(".ogg");
      normalized.push({
        type: isAudio ? "audio" : "file",
        file_url: url,
        payload: { url },
      });
      if (!attachmentUrl) {
        attachmentUrl = url;
        messageType = isAudio ? "audio" : "file";
      }
    }
  }

  return { normalized, messageType, attachmentUrl };
}

/**
 * Handle incoming messaging events.
 *
 * Enriches every SSE payload with:
 *  - `conversationId` — resolved from Supabase
 *  - `fromMe` — true when the sender is our page / IG account
 *
 * Persists the message to Supabase immediately.
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
    console.warn(
      `[Webhook] No user found for participant IDs: ${sender.id}, ${recipient.id}. Ignoring.`,
    );
    return;
  }

  const owner = identity.user;
  const creds = identity.account;
  const ownerEmail = owner.email; // Extracted email for isolation
  const senderId = sender.id;
  const recipientId = recipient.id;
  const timestamp = event.timestamp as number;

  webhookDebug(
    `[Webhook] Message event from ${senderId} to ${recipientId} (Owner: ${ownerEmail})`,
  );

  // Derive fromMe: the sender is our page/IG user
  const fromMe = senderId === instagramUserId;

  // Resolve the conversationId
  let conversationId = await resolveConversationId(
    senderId,
    recipientId,
    instagramUserId,
    ownerEmail,
  );

  // If conversation not found in DB, try to fetch fresh list from Graph API
  // This handles the case where a new lead messages while the app was offline
  if (!conversationId) {
    webhookDebug(
      "[Webhook] Conversation ID not found in DB. Fetching fresh list from Graph API...",
    );
    try {
      const accessToken = decryptData(creds.accessToken);
      const rawConvs = await fetchAllConversations(creds.pageId, accessToken, {
        pageLimit: 50,
        maxPages: 20,
        graphVersion: creds.graphVersion,
      });
      // Best-effort only: resolving the workspace's "new lead" status must
      // never block saving the conversation itself. A failure here (e.g. a
      // migration that hasn't fully applied yet) just falls back to the
      // literal "New Lead" default inside mapConversationToUser.
      const newStatusTag = await findWorkspaceTagByRole(
        ownerEmail,
        "new",
      ).catch((error) => {
        console.error(
          "[Webhook] Failed to resolve new-lead status tag, falling back to default:",
          error,
        );
        return null;
      });
      const users = rawConvs.data.map((c) =>
        mapConversationToUser(c, instagramUserId, {
          accountId: creds.accountId,
          ownerPageId: creds.pageId,
          accountLabel: creds.instagramUsername || creds.pageName,
          initialStatusName: newStatusTag?.name,
        }),
      );
      await saveConversationsToDb(users, ownerEmail);

      // Retry resolving after refresh
      conversationId = await resolveConversationId(
        senderId,
        recipientId,
        instagramUserId,
        ownerEmail,
      );
      if (conversationId) {
        webhookDebug(
          `[Webhook] Successfully resolved conversation ID ${conversationId} after refresh`,
        );
      } else {
        console.warn(
          "[Webhook] Still could not resolve conversation ID after refresh",
        );
      }
    } catch (err) {
      console.error("[Webhook] Failed to refresh conversations:", err);
    }
  }

  if (
    conversationId &&
    (await isConversationUsernameBlocked(conversationId, ownerEmail))
  ) {
    webhookDebug(
      `[Webhook] Ignoring event for blocked username on conversation ${conversationId}`,
    );
    return;
  }

  // Handle message
  if (event.message) {
    const msg = event.message as {
      mid: string;
      text?: string;
      attachments?: unknown[];
      is_echo?: boolean;
      reply_to?: { story?: { url?: string; id?: string } };
      referral?: {
        ads_context_data?: { ad_title?: string; photo_url?: string };
      };
    };
    const messageId = msg.mid;
    const messageText = msg.text;
    const attachments = msg.attachments;
    const isEcho = Boolean(msg.is_echo);

    const {
      normalized: sseAttachments,
      messageType,
      attachmentUrl,
    } = normalizeWebhookAttachments(attachments);

    if (isEcho) {
      webhookDebug(
        `[Webhook] Message echo (sent): ${messageText || "[attachment]"}`,
      );
    } else {
      webhookDebug(
        `[Webhook] Message received: ${messageText || "[attachment]"}`,
      );
    }

    // Persist to Supabase if conversation is known
    let emittedMessageId = messageId;
    let emittedTimestamp = timestamp;
    let emittedAttachmentUrl = attachmentUrl;
    let emittedDuration: string | undefined;
    let shouldSaveWebhookMessage = true;

    if (conversationId) {
      const newMessage: Message = {
        id: messageId,
        fromMe: isEcho ? true : fromMe,
        type: messageType,
        text: messageText || "",
        timestamp: new Date(timestamp).toISOString(),
        attachmentUrl,
      };

      if (isEcho && messageType === "audio") {
        const reconciled = await reconcileOutgoingAudioEchoWithLocalFallback({
          ownerEmail,
          conversationId,
          timestamp: newMessage.timestamp || new Date(timestamp).toISOString(),
          text: newMessage.text,
        });
        if (reconciled) {
          shouldSaveWebhookMessage = false;
          emittedMessageId = reconciled.id;
          const reconciledTimestampMs = reconciled.timestamp
            ? new Date(reconciled.timestamp).getTime()
            : Number.NaN;
          emittedTimestamp = Number.isFinite(reconciledTimestampMs)
            ? reconciledTimestampMs
            : timestamp;
          emittedAttachmentUrl = reconciled.attachmentUrl || attachmentUrl;
          emittedDuration = reconciled.duration;
          webhookDebug(
            `[Webhook] Reused local audio fallback ${reconciled.id} for outgoing audio echo ${messageId}`,
          );
        }
      }

      if (shouldSaveWebhookMessage) {
        await saveMessageToDb(
          { ...newMessage, source: "instagram" },
          conversationId,
          ownerEmail,
        );
        webhookDebug(`[Webhook] Persisted message ${messageId} to Supabase`);
      }

      const emittedAttachments =
        emittedAttachmentUrl && sseAttachments.length > 0
          ? sseAttachments.map((attachment, index) =>
              index === 0
                ? {
                    ...attachment,
                    file_url: emittedAttachmentUrl,
                    payload: { url: emittedAttachmentUrl },
                  }
                : attachment,
            )
          : sseAttachments;

      const ssePayload: SSEEvent = {
        type: isEcho ? "message_echo" : "new_message",
        timestamp: new Date().toISOString(),
        data: {
          senderId,
          recipientId,
          conversationId: conversationId || "",
          accountId: creds.accountId,
          messageId: emittedMessageId,
          text: messageText,
          duration: emittedDuration,
          attachments: emittedAttachments,
          timestamp: emittedTimestamp,
          fromMe: isEcho ? true : fromMe,
        },
      };

      // Emit after persistence/reconciliation so frontend gets canonical message IDs.
      emitWorkspaceSseEvent(ownerEmail, ssePayload);

      // Update Conversation Metadata (Last Message, Time, Unread)
      // This ensures the sidebar is up-to-date in the DB immediately
      try {
        const timeStr = getRelativeTime(new Date(timestamp).toISOString());
        let previewText = messageText;

        if (!previewText) {
          if (messageType === "image") previewText = "Sent an image";
          else if (messageType === "video") previewText = "Sent a video";
          else if (messageType === "audio")
            previewText = "Sent an audio message";
          else if (messageType === "file") previewText = "Sent a file";
          else previewText = "Sent a message";
        }

        // Only increment unread count for incoming messages (not from me, not echos)
        const incrementUnread = !fromMe && !isEcho;
        // For outgoing messages, clear "waiting for reply" count for this conversation.
        const clearUnread = fromMe || isEcho;
        // Referral/reply_to signals only ever describe the lead's own message to us.
        const leadSource = incrementUnread
          ? extractLeadSourceFromWebhookMessage(
              msg,
              new Date(timestamp).toISOString(),
            )
          : null;

        await updateConversationMetadata(
          conversationId,
          ownerEmail,
          previewText,
          timeStr,
          incrementUnread,
          clearUnread,
          new Date(timestamp).toISOString(),
          leadSource,
        );
        webhookDebug(
          `[Webhook] Updated metadata for conversation ${conversationId}`,
        );

        // Run status classification after the response is sent - Meta
        // expects a fast ack, and a non-streaming LLM call can take a
        // couple of seconds.
        if (incrementUnread) {
          after(() =>
            maybeClassifyConversationStatus(conversationId, ownerEmail),
          );
        }

        // Fetch and update profile picture for incoming messages
        if (!fromMe && !isEcho) {
          try {
            const accessToken = decryptData(creds.accessToken);
            // Fetch profile pic for the sender (who is the external user)
            const profilePic = await fetchUserProfile(
              senderId,
              accessToken,
              creds.graphVersion,
            );

            if (profilePic) {
              await updateUserAvatar(conversationId, ownerEmail, profilePic);
              webhookDebug(`[Webhook] Updated avatar for ${senderId}`);
            }
          } catch (err) {
            console.error(
              `[Webhook] Failed to update avatar for ${senderId}:`,
              err,
            );
          }
        }
      } catch (err) {
        console.error("[Webhook] Failed to update conversation metadata:", err);
      }
    } else {
      const ssePayload: SSEEvent = {
        type: isEcho ? "message_echo" : "new_message",
        timestamp: new Date().toISOString(),
        data: {
          senderId,
          recipientId,
          conversationId: "",
          accountId: creds.accountId,
          messageId,
          text: messageText,
          attachments: sseAttachments,
          timestamp,
          fromMe: isEcho ? true : fromMe,
        },
      };
      emitWorkspaceSseEvent(ownerEmail, ssePayload);
      console.warn(
        "[Webhook] Could not persist message: Conversation ID not found",
      );
    }
  }

  // Handle message seen (read receipts)
  if (event.message_seen) {
    webhookDebug("[Webhook] Message seen event");

    const seenPayload: SSEEvent = {
      type: "message_seen",
      timestamp: new Date().toISOString(),
      data: {
        senderId,
        recipientId,
        timestamp,
      },
    };

    emitWorkspaceSseEvent(ownerEmail, seenPayload);
  }

  // Handle message delivery
  if (event.delivery) {
    webhookDebug("[Webhook] Message delivery event");
  }
}

/**
 * Checks whether a conversation's IG username is on the workspace's block list.
 * Used to silently ignore webhook events for accounts the workspace has excluded.
 */
async function isConversationUsernameBlocked(
  conversationId: string,
  ownerEmail: string,
): Promise<boolean> {
  const [conversation, blockedUsernames] = await Promise.all([
    findConversationById(conversationId, ownerEmail),
    getBlockedUsernameSet(ownerEmail),
  ]);
  if (!conversation || blockedUsernames.size === 0) return false;
  return blockedUsernames.has(extractUsernameFromUser(conversation));
}

/**
 * Handle change events (reactions, deletions, etc.)
 */
async function handleChange(
  change: { field?: string; value?: unknown },
  entryId: string,
) {
  webhookDebug("[Webhook] Change event:", change.field);

  // Handle different types of changes
  switch (change.field) {
    case "messages":
      webhookDebug("[Webhook] Message change detected");
      break;
    case "message_reactions":
      webhookDebug("[Webhook] Message reaction detected");
      break;
    case "comments":
      await handleCommentChange(entryId, change.value);
      break;
    default:
      webhookDebug("[Webhook] Unknown change type:", change.field);
  }
}

interface CommentWebhookValue {
  comment_id?: string;
  text?: string;
  parent_id?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string };
}

/**
 * Fires a workspace's keyword-triggered comment automation, if one
 * matches. Only top-level comments trigger automations - a reply to
 * someone else's comment is ignored so replying-to-a-reply doesn't look
 * like a second automated DM firing off the same post. Never throws - a
 * broken automation should never take down comment webhook processing.
 */
async function handleCommentChange(entryId: string, rawValue: unknown) {
  try {
    const value = rawValue as CommentWebhookValue;
    const commentId = value?.comment_id;
    const mediaId = value?.media?.id;
    const commenterId = value?.from?.id;
    if (!commentId || !mediaId || !commenterId || value?.parent_id) return;

    const identity = await getUserByInstagramId(entryId);
    if (!identity) return;

    const { user: owner, account: creds } = identity;
    if (commenterId === creds.instagramUserId) return;

    const automations = await listActiveCommentAutomations(owner.email);
    if (automations.length === 0) return;

    const automation = matchCommentAutomation(automations, {
      mediaId,
      commentText: value?.text || "",
    });
    if (!automation) return;

    const variants = await listAutomationVariants(owner.email, automation.id);
    const variant = pickVariant(variants);
    const replyText = variant?.message || automation.replyMessage;

    const accessToken = decryptData(creds.accessToken);
    await sendPrivateReplyToComment(
      creds.pageId,
      commentId,
      replyText,
      accessToken,
      creds.graphVersion,
    );
    await incrementCommentAutomationTriggerCount(owner.email, automation.id);
    if (variant) {
      await incrementVariantTriggerCount(owner.email, variant.id);
    }
    await recordPendingCommentAutomationSend({
      ownerEmail: owner.email,
      automationId: automation.id,
      variantId: variant?.id ?? null,
      commenterInstagramId: commenterId,
    });
    webhookDebug(
      `[Webhook] Fired comment automation "${automation.name}" for comment ${commentId}`,
    );
  } catch (error) {
    console.error("[Webhook] Failed to process comment automation:", error);
  }
}
