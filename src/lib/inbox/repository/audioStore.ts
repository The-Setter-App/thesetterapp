import type { Db } from "mongodb";
import { GridFSBucket, ObjectId } from "mongodb";
import {
  AUDIO_BUCKET,
  getInboxDb,
  MESSAGES_COLLECTION,
} from "@/lib/inbox/repository/core";
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

function getAudioBucket(db: Db): GridFSBucket {
  return new GridFSBucket(db, { bucketName: AUDIO_BUCKET });
}

export async function saveVoiceNoteBlobToGridFs(params: {
  ownerEmail: string;
  conversationId: string;
  recipientId: string;
  messageId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<{ fileId: string; mimeType: string; size: number }> {
  const db = await getInboxDb();
  const bucket = getAudioBucket(db);

  const uploadStream = bucket.openUploadStream(params.fileName, {
    metadata: {
      ownerEmail: params.ownerEmail,
      conversationId: params.conversationId,
      recipientId: params.recipientId,
      messageId: params.messageId,
      mimeType: params.mimeType,
    },
  });

  await new Promise<void>((resolve, reject) => {
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve());
    uploadStream.end(params.bytes);
  });

  return {
    fileId: uploadStream.id.toString(),
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
  const db = await getInboxDb();

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
    const existingDoc = await db
      .collection<MessageDoc>(MESSAGES_COLLECTION)
      .findOne({
        ownerEmail: params.ownerEmail,
        conversationId: params.conversationId,
        clientTempId: params.clientTempId,
      });
    existing = existingDoc as Message | null;
  }

  if (!existing) {
    const fiveMinutesAgoIso = new Date(
      Date.now() - 5 * 60 * 1000,
    ).toISOString();
    const existingDoc = await db
      .collection<MessageDoc>(MESSAGES_COLLECTION)
      .findOne(
        {
          ownerEmail: params.ownerEmail,
          conversationId: params.conversationId,
          fromMe: true,
          type: "audio",
          source: { $ne: "local_audio_fallback" },
          timestamp: { $gte: fiveMinutesAgoIso },
        },
        { sort: { timestamp: -1 } },
      );
    existing = existingDoc as Message | null;
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
    await db.collection(MESSAGES_COLLECTION).updateOne(
      { id: existing.id, ownerEmail: params.ownerEmail },
      {
        $set: {
          ...merged,
          conversationId: params.conversationId,
          ownerEmail: params.ownerEmail,
        },
      },
      { upsert: true },
    );
    return merged;
  }

  await saveMessageToDb(baseMessage, params.conversationId, params.ownerEmail);
  return baseMessage;
}

export async function getVoiceNoteStreamForMessage(
  messageId: string,
  ownerEmail: string,
): Promise<{
  stream: NodeJS.ReadableStream;
  mimeType: string;
  size: number;
} | null> {
  const db = await getInboxDb();

  const message = await db
    .collection<MessageDoc>(MESSAGES_COLLECTION)
    .findOne({ id: messageId, ownerEmail });
  const fileId = message?.audioStorage?.fileId;
  if (!fileId) return null;

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(fileId);
  } catch {
    return null;
  }

  const bucket = getAudioBucket(db);
  const files = await bucket
    .find({ _id: objectId, "metadata.ownerEmail": ownerEmail })
    .toArray();
  const file = files[0];
  if (!file) return null;

  const fileMime = (file.metadata as { mimeType?: string } | undefined)
    ?.mimeType;

  return {
    stream: bucket.openDownloadStream(objectId),
    mimeType: fileMime || message.audioStorage?.mimeType || "audio/webm",
    size:
      typeof file.length === "number"
        ? file.length
        : message.audioStorage?.size || 0,
  };
}
