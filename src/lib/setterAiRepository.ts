import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { ChatSession, Message } from "@/types/ai";

const DB_NAME = "thesetterapp";
const SESSIONS_COLLECTION = "setter_ai_sessions";
const MESSAGES_COLLECTION = "setter_ai_messages";
const MAX_TITLE_LENGTH = 30;
const CACHE_TTL_MS = 60 * 1000;

type SessionDoc = {
  _id: ObjectId;
  email: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessagePreview?: string;
};

type MessageDoc = {
  _id: ObjectId;
  email: string;
  sessionId: ObjectId;
  role: "user" | "ai";
  text: string;
  createdAt: Date;
  requestId?: string;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

let indexesReady = false;
const sessionsCache = new Map<string, CacheEntry<ChatSession[]>>();
const messagesCache = new Map<string, CacheEntry<Message[]>>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildDefaultTitleFromText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "New Conversation";
  if (trimmed.length <= MAX_TITLE_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_TITLE_LENGTH)}...`;
}

function mapSessionDoc(doc: SessionDoc): ChatSession {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    lastMessagePreview: doc.lastMessagePreview,
    messages: [],
  };
}

function mapMessageDoc(doc: MessageDoc): Message {
  return {
    id: doc._id.toHexString(),
    role: doc.role,
    text: doc.text,
    createdAt: doc.createdAt.toISOString(),
  };
}

async function ensureIndexes(): Promise<void> {
  if (indexesReady) return;
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  await Promise.allSettled([
    db.collection(SESSIONS_COLLECTION).createIndex({ email: 1, updatedAt: -1 }),
    db
      .collection(MESSAGES_COLLECTION)
      .createIndex({ email: 1, sessionId: 1, createdAt: 1 }),
    db
      .collection(MESSAGES_COLLECTION)
      .createIndex(
        { email: 1, sessionId: 1, requestId: 1 },
        { unique: true, sparse: true },
      ),
  ]);
  indexesReady = true;
}

function getCached<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const cached = map.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    map.delete(key);
    return null;
  }
  return cached.value;
}

function setCached<T>(
  map: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
): void {
  map.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function invalidateSessionCache(email: string): void {
  sessionsCache.delete(`sessions:${email}`);
}

function invalidateMessageCache(email: string, sessionId: string): void {
  messagesCache.delete(`messages:${email}:${sessionId}`);
}

export async function listSetterAiSessionsByEmail(
  email: string,
): Promise<ChatSession[]> {
  await ensureIndexes();
  const normalizedEmail = normalizeEmail(email);
  const cacheKey = `sessions:${normalizedEmail}`;
  const cached = getCached(sessionsCache, cacheKey);
  if (cached) return cached;

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const docs = (await db
    .collection<SessionDoc>(SESSIONS_COLLECTION)
    .find({ email: normalizedEmail })
    .sort({ updatedAt: -1 })
    .toArray()) as SessionDoc[];

  const sessions = docs.map(mapSessionDoc);
  setCached(sessionsCache, cacheKey, sessions);
  return sessions;
}

export async function createSetterAiSession(
  email: string,
  title?: string,
): Promise<ChatSession> {
  await ensureIndexes();
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();
  const safeTitle =
    typeof title === "string" && title.trim()
      ? title.trim().slice(0, 80)
      : "New Conversation";

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const result = await db.collection(SESSIONS_COLLECTION).insertOne({
    email: normalizedEmail,
    title: safeTitle,
    createdAt: now,
    updatedAt: now,
  });

  invalidateSessionCache(normalizedEmail);
  return {
    id: result.insertedId.toHexString(),
    title: safeTitle,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    messages: [],
  };
}

export async function getSetterAiSessionById(
  email: string,
  sessionId: string,
): Promise<ChatSession | null> {
  await ensureIndexes();
  const normalizedEmail = normalizeEmail(email);
  if (!ObjectId.isValid(sessionId)) return null;

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const doc = (await db.collection<SessionDoc>(SESSIONS_COLLECTION).findOne({
    _id: new ObjectId(sessionId),
    email: normalizedEmail,
  })) as SessionDoc | null;

  if (!doc) return null;
  return mapSessionDoc(doc);
}

export async function listSetterAiMessages(
  email: string,
  sessionId: string,
): Promise<Message[]> {
  await ensureIndexes();
  const normalizedEmail = normalizeEmail(email);
  if (!ObjectId.isValid(sessionId)) return [];

  const cacheKey = `messages:${normalizedEmail}:${sessionId}`;
  const cached = getCached(messagesCache, cacheKey);
  if (cached) return cached;

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const docs = (await db
    .collection<MessageDoc>(MESSAGES_COLLECTION)
    .find({
      email: normalizedEmail,
      sessionId: new ObjectId(sessionId),
    })
    .sort({ createdAt: 1 })
    .toArray()) as MessageDoc[];

  const messages = docs.map(mapMessageDoc);
  setCached(messagesCache, cacheKey, messages);
  return messages;
}

export async function buildSetterAiModelContext(
  email: string,
  sessionId: string,
  incomingUserMessage: string,
  maxHistory = 30,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const safeIncomingMessage = incomingUserMessage.trim().slice(0, 8000);
  const previousMessages = await listSetterAiMessages(email, sessionId);
  const context = previousMessages.slice(-maxHistory).map((message) => ({
    role: (message.role === "user" ? "user" : "assistant") as
      | "user"
      | "assistant",
    content: message.text.trim().slice(0, 8000),
  }));

  context.push({
    role: "user",
    content: safeIncomingMessage,
  });

  return context;
}

export async function appendSetterAiExchangeAfterStream(
  email: string,
  sessionId: string,
  userText: string,
  aiText: string,
  requestId?: string,
): Promise<void> {
  await ensureIndexes();
  const normalizedEmail = normalizeEmail(email);
  if (!ObjectId.isValid(sessionId)) {
    throw new Error("Invalid session id");
  }

  const safeUserText = userText.trim().slice(0, 8000);
  const safeAiText = aiText.trim().slice(0, 8000);
  const safeRequestId =
    typeof requestId === "string" && requestId.trim().length > 0
      ? requestId.trim().slice(0, 120)
      : undefined;
  if (!safeUserText || !safeAiText) {
    throw new Error("Cannot persist empty exchange");
  }

  const sessionObjectId = new ObjectId(sessionId);
  const now = new Date();
  const preview = safeAiText || safeUserText;

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  if (safeRequestId) {
    const existing = await db
      .collection<MessageDoc>(MESSAGES_COLLECTION)
      .findOne({
        email: normalizedEmail,
        sessionId: sessionObjectId,
        requestId: safeRequestId,
      });
    if (existing) {
      return;
    }
  }

  const existingCount = await db
    .collection(MESSAGES_COLLECTION)
    .countDocuments({
      email: normalizedEmail,
      sessionId: sessionObjectId,
    });

  const sessionDoc = (await db
    .collection<SessionDoc>(SESSIONS_COLLECTION)
    .findOne({
      _id: sessionObjectId,
      email: normalizedEmail,
    })) as SessionDoc | null;

  if (!sessionDoc) {
    throw new Error("Session not found");
  }

  try {
    await db.collection(MESSAGES_COLLECTION).insertMany([
      {
        email: normalizedEmail,
        sessionId: sessionObjectId,
        role: "user",
        text: safeUserText,
        createdAt: now,
        requestId: safeRequestId,
      },
      {
        email: normalizedEmail,
        sessionId: sessionObjectId,
        role: "ai",
        text: safeAiText,
        createdAt: now,
      },
    ]);
  } catch (error) {
    const maybeCode = (error as { code?: number } | undefined)?.code;
    if (maybeCode === 11000 && safeRequestId) {
      return;
    }
    throw error;
  }

  const shouldSetTitle =
    existingCount === 0 && sessionDoc.title === "New Conversation";
  const nextTitle = shouldSetTitle
    ? buildDefaultTitleFromText(safeUserText)
    : sessionDoc.title;

  await db.collection(SESSIONS_COLLECTION).updateOne(
    { _id: sessionObjectId, email: normalizedEmail },
    {
      $set: {
        updatedAt: now,
        lastMessagePreview: preview,
        title: nextTitle,
      },
    },
  );

  invalidateSessionCache(normalizedEmail);
  invalidateMessageCache(normalizedEmail, sessionId);
}

export async function deleteSetterAiSession(
  email: string,
  sessionId: string,
): Promise<boolean> {
  await ensureIndexes();
  const normalizedEmail = normalizeEmail(email);
  if (!ObjectId.isValid(sessionId)) {
    return false;
  }

  const sessionObjectId = new ObjectId(sessionId);
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const result = await db.collection(SESSIONS_COLLECTION).deleteOne({
    _id: sessionObjectId,
    email: normalizedEmail,
  });

  if (!result.deletedCount) {
    return false;
  }

  await db.collection(MESSAGES_COLLECTION).deleteMany({
    email: normalizedEmail,
    sessionId: sessionObjectId,
  });

  invalidateSessionCache(normalizedEmail);
  invalidateMessageCache(normalizedEmail, sessionId);
  return true;
}
