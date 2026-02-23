import { Readable } from "node:stream";
import { AUDIO_BUCKET, getInboxSupabase, MESSAGES_COLLECTION } from "@/lib/inbox/repository/core";
import { saveMessageToDb } from "@/lib/inbox/repository/messageStore";
import type { Message } from "@/types/inbox";

type MessageDoc = Message & {
  ownerEmail: string;
  conversationId: string;
  clientTempId?: string;
  fromMe?: boolean;
  source?: string;
  type?: string;
  timestamp?: string;
  audioStorage?: {
    fileId?: string;
    mimeType?: string;
    size?: number;
  };
};

export async function saveVoiceNoteBlobToGridFs(params: {
  ownerEmail: string;
  conversationId: string;
  recipientId: string;
  messageId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<{ fileId: string; mimeType: string; size: number }> {
  const supabase = getInboxSupabase();
  const safeOwner = encodeURIComponent(params.ownerEmail);
  const safeConversation = encodeURIComponent(params.conversationId);
  const safeMessage = encodeURIComponent(params.messageId);
  const extension = params.fileName.includes(".") ? params.fileName.split(".").pop() : "webm";
  const objectPath = `${safeOwner}/${safeConversation}/${safeMessage}.${extension}`;

  const { error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(objectPath, params.bytes, { contentType: params.mimeType, upsert: true });

  if (error) {
    throw new Error(`Failed to upload voice note: ${error.message}`);
  }

  return {
    fileId: objectPath,
    mimeType: params.mimeType,
    size: params.bytes.length,
  };
}

export async function saveOrUpdateLocalAudioMessage(params: {
  ownerEmail: string;
  conversationId: string;
  recipientId: string;
  messageId: string;
  clientTempId?: string;
  timestamp: string;
  duration?: string;
  audioStorage: {
    kind: "gridfs";
    fileId: string;
    mimeType: string;
    size: number;
  };
}): Promise<Message> {
  const supabase = getInboxSupabase();

  const baseAttachmentUrl = `/api/inbox/messages/${encodeURIComponent(params.messageId)}/audio`;
  const baseMessage: Message = {
    id: params.messageId,
    clientTempId: params.clientTempId,
    fromMe: true,
    type: "audio",
    text: "",
    timestamp: params.timestamp,
    duration: params.duration,
    attachmentUrl: baseAttachmentUrl,
    source: "local_audio_fallback",
    audioStorage: params.audioStorage,
  };

  let existing: Message | null = null;
  if (params.clientTempId) {
    const { data } = await supabase
      .from(MESSAGES_COLLECTION)
      .select("payload")
      .eq("owner_email", params.ownerEmail)
      .eq("conversation_id", params.conversationId)
      .eq("client_temp_id", params.clientTempId)
      .maybeSingle();

    existing = (data as { payload: Message } | null)?.payload ?? null;
  }

  if (!existing) {
    const fiveMinutesAgoIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from(MESSAGES_COLLECTION)
      .select("payload")
      .eq("owner_email", params.ownerEmail)
      .eq("conversation_id", params.conversationId)
      .eq("from_me", true)
      .eq("type", "audio")
      .neq("source", "local_audio_fallback")
      .gte("timestamp_text", fiveMinutesAgoIso)
      .order("timestamp_text", { ascending: false })
      .limit(1);

    const row = (data ?? [])[0] as { payload: Message } | undefined;
    existing = row?.payload ?? null;
  }

  if (existing?.id) {
    const mergedAttachmentUrl = `/api/inbox/messages/${encodeURIComponent(existing.id)}/audio`;
    const merged: Message = {
      ...existing,
      ...baseMessage,
      id: existing.id,
      timestamp: existing.timestamp || params.timestamp,
      attachmentUrl: mergedAttachmentUrl,
    };
    await saveMessageToDb(merged, params.conversationId, params.ownerEmail);
    return merged;
  }

  await saveMessageToDb(baseMessage, params.conversationId, params.ownerEmail);
  return baseMessage;
}

export async function reconcileOutgoingAudioEchoWithLocalFallback(params: {
  ownerEmail: string;
  conversationId: string;
  timestamp: string;
  text?: string;
}): Promise<Message | null> {
  const supabase = getInboxSupabase();
  const tenMinutesAgoIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from(MESSAGES_COLLECTION)
    .select("payload")
    .eq("owner_email", params.ownerEmail)
    .eq("conversation_id", params.conversationId)
    .eq("from_me", true)
    .eq("type", "audio")
    .eq("source", "local_audio_fallback")
    .gte("timestamp_text", tenMinutesAgoIso)
    .order("timestamp_text", { ascending: false })
    .limit(5);

  const candidates = (data ?? []).map((row) => (row as { payload: Message }).payload as MessageDoc);
  if (candidates.length === 0) {
    return null;
  }

  const targetTimestampMs = Date.parse(params.timestamp);
  const fallback = candidates.reduce((best, candidate) => {
    if (!best) return candidate;
    if (!Number.isFinite(targetTimestampMs)) return best;

    const bestDiff = Math.abs(Date.parse(best.timestamp || "") - targetTimestampMs);
    const candidateDiff = Math.abs(Date.parse(candidate.timestamp || "") - targetTimestampMs);
    return candidateDiff < bestDiff ? candidate : best;
  }, candidates[0]);

  const merged: Message = {
    ...(fallback as Message),
    text: params.text || fallback.text || "",
    timestamp: params.timestamp || fallback.timestamp,
  };

  await saveMessageToDb(merged, params.conversationId, params.ownerEmail);
  return merged;
}

export async function getVoiceNoteStreamForMessage(
  messageId: string,
  ownerEmail: string,
): Promise<{
  stream: NodeJS.ReadableStream;
  mimeType: string;
  size: number;
} | null> {
  const supabase = getInboxSupabase();

  const { data } = await supabase
    .from(MESSAGES_COLLECTION)
    .select("payload")
    .eq("id", messageId)
    .eq("owner_email", ownerEmail)
    .maybeSingle();

  const message = (data as { payload: MessageDoc } | null)?.payload;
  const fileId = message?.audioStorage?.fileId;
  if (!fileId) return null;

  const { data: blob, error } = await supabase.storage.from(AUDIO_BUCKET).download(fileId);
  if (error || !blob) return null;

  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    stream: Readable.from(buffer),
    mimeType: message.audioStorage?.mimeType || blob.type || "audio/webm",
    size: buffer.length,
  };
}
