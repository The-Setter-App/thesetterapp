"use client";

import type { ChatSession, Message } from "@/types/ai";

const DB_NAME = "setter_ai_cache_db";
const DB_VERSION = 1;
const STORE_NAME = "key_value_store";
const LAST_EMAIL_KEY = "setter_ai_last_email";
const DELETED_SESSIONS_TOMBSTONE_TTL_MS = 24 * 60 * 60 * 1000;

class SetterAiCache {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("IndexedDB unavailable on server."));
    }

    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) =>
        resolve((event.target as IDBOpenDBRequest).result);
      request.onerror = (event) =>
        reject((event.target as IDBOpenDBRequest).error);
    });

    return this.dbPromise;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => resolve((request.result as T) ?? null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(value, key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      return;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      return;
    }
  }
}

const setterAiCache = new SetterAiCache();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sessionsKey(email: string): string {
  return `setter_ai_sessions:${normalizeEmail(email)}`;
}

function sessionsTimestampKey(email: string): string {
  return `setter_ai_sessions_cached_at:${normalizeEmail(email)}`;
}

function messagesKey(email: string, sessionId: string): string {
  return `setter_ai_messages:${normalizeEmail(email)}:${sessionId}`;
}

function messagesTimestampKey(email: string, sessionId: string): string {
  return `setter_ai_messages_cached_at:${normalizeEmail(email)}:${sessionId}`;
}

function deletedSessionsKey(email: string): string {
  return `setter_ai_deleted_sessions:${normalizeEmail(email)}`;
}

type DeletedSessionTombstones = Record<string, number>;

function pruneDeletedTombstones(
  tombstones: DeletedSessionTombstones,
): DeletedSessionTombstones {
  const now = Date.now();
  const entries = Object.entries(tombstones).filter(
    ([, deletedAt]) => now - deletedAt < DELETED_SESSIONS_TOMBSTONE_TTL_MS,
  );
  return Object.fromEntries(entries);
}

export async function getSetterAiLastEmail(): Promise<string | null> {
  return setterAiCache.get<string>(LAST_EMAIL_KEY);
}

export async function setSetterAiLastEmail(email: string): Promise<void> {
  await setterAiCache.set(LAST_EMAIL_KEY, normalizeEmail(email));
}

export async function getCachedSetterAiSessions(
  email: string,
): Promise<ChatSession[] | null> {
  return setterAiCache.get<ChatSession[]>(sessionsKey(email));
}

export async function setCachedSetterAiSessions(
  email: string,
  sessions: ChatSession[],
): Promise<void> {
  await setterAiCache.set(sessionsKey(email), sessions);
  await setterAiCache.set(sessionsTimestampKey(email), Date.now());
}

export async function getCachedSetterAiSessionsTimestamp(
  email: string,
): Promise<number | null> {
  return setterAiCache.get<number>(sessionsTimestampKey(email));
}

export async function getCachedSetterAiMessages(
  email: string,
  sessionId: string,
): Promise<Message[] | null> {
  return setterAiCache.get<Message[]>(messagesKey(email, sessionId));
}

export async function setCachedSetterAiMessages(
  email: string,
  sessionId: string,
  messages: Message[],
): Promise<void> {
  await setterAiCache.set(messagesKey(email, sessionId), messages);
  await setterAiCache.set(messagesTimestampKey(email, sessionId), Date.now());
}

export async function getCachedSetterAiMessagesTimestamp(
  email: string,
  sessionId: string,
): Promise<number | null> {
  return setterAiCache.get<number>(messagesTimestampKey(email, sessionId));
}

export async function clearCachedSetterAiMessages(
  email: string,
  sessionId: string,
): Promise<void> {
  await Promise.all([
    setterAiCache.delete(messagesKey(email, sessionId)),
    setterAiCache.delete(messagesTimestampKey(email, sessionId)),
  ]);
}

export async function removeCachedSetterAiSession(
  email: string,
  sessionId: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const [sessions] = await Promise.all([
    setterAiCache.get<ChatSession[]>(sessionsKey(normalizedEmail)),
    clearCachedSetterAiMessages(normalizedEmail, sessionId),
  ]);

  if (!sessions) {
    return;
  }

  const nextSessions = sessions.filter((session) => session.id !== sessionId);
  await setCachedSetterAiSessions(normalizedEmail, nextSessions);
}

export async function replaceCachedSetterAiSessionId(
  email: string,
  fromSessionId: string,
  toSession: ChatSession,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const [sessions, fromMessages, fromMessagesTimestamp] = await Promise.all([
    setterAiCache.get<ChatSession[]>(sessionsKey(normalizedEmail)),
    setterAiCache.get<Message[]>(messagesKey(normalizedEmail, fromSessionId)),
    setterAiCache.get<number>(
      messagesTimestampKey(normalizedEmail, fromSessionId),
    ),
  ]);

  if (sessions) {
    const hasTarget = sessions.some((session) => session.id === toSession.id);
    const nextSessions = sessions
      .map((session) => (session.id === fromSessionId ? toSession : session))
      .filter((session, index, arr) => {
        if (session.id !== toSession.id) return true;
        const firstIndex = arr.findIndex((item) => item.id === toSession.id);
        return index === firstIndex || !hasTarget;
      });
    await setCachedSetterAiSessions(normalizedEmail, nextSessions);
  }

  if (fromMessages) {
    await setterAiCache.set(
      messagesKey(normalizedEmail, toSession.id),
      fromMessages,
    );
    await setterAiCache.delete(messagesKey(normalizedEmail, fromSessionId));
  }

  if (fromMessagesTimestamp) {
    await setterAiCache.set(
      messagesTimestampKey(normalizedEmail, toSession.id),
      fromMessagesTimestamp,
    );
    await setterAiCache.delete(
      messagesTimestampKey(normalizedEmail, fromSessionId),
    );
  }
}

export async function getDeletedSetterAiSessionIds(
  email: string,
): Promise<string[]> {
  const normalizedEmail = normalizeEmail(email);
  const tombstones =
    (await setterAiCache.get<DeletedSessionTombstones>(
      deletedSessionsKey(normalizedEmail),
    )) || {};
  const pruned = pruneDeletedTombstones(tombstones);

  if (Object.keys(pruned).length !== Object.keys(tombstones).length) {
    await setterAiCache.set(deletedSessionsKey(normalizedEmail), pruned);
  }

  return Object.keys(pruned);
}

export async function markDeletedSetterAiSessionId(
  email: string,
  sessionId: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const tombstones =
    (await setterAiCache.get<DeletedSessionTombstones>(
      deletedSessionsKey(normalizedEmail),
    )) || {};
  const pruned = pruneDeletedTombstones(tombstones);
  pruned[sessionId] = Date.now();
  await setterAiCache.set(deletedSessionsKey(normalizedEmail), pruned);
}

export async function unmarkDeletedSetterAiSessionId(
  email: string,
  sessionId: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const tombstones =
    (await setterAiCache.get<DeletedSessionTombstones>(
      deletedSessionsKey(normalizedEmail),
    )) || {};
  if (!tombstones[sessionId]) {
    return;
  }
  const pruned = pruneDeletedTombstones(tombstones);
  delete pruned[sessionId];
  await setterAiCache.set(deletedSessionsKey(normalizedEmail), pruned);
}
