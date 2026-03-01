"use client";

import { createLayeredCache } from "@/lib/cache/core/layeredCache";
import { APP_CACHE_STORES } from "@/lib/cache/idb/appDb";
import type { ChatSession, Message } from "@/types/ai";

const LAST_EMAIL_KEY = "setter_ai_last_email";
const DELETED_SESSIONS_TOMBSTONE_TTL_MS = 24 * 60 * 60 * 1000;

type DeletedSessionTombstones = Record<string, number>;

const setterAiCache = createLayeredCache({
  storeName: APP_CACHE_STORES.setterAi,
  logLabel: "SetterAiCache",
  writeDebounceMs: 50,
});

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

export function getHotSetterAiLastEmail(): string | null {
  return setterAiCache.peek<string>(LAST_EMAIL_KEY) ?? null;
}

export async function setSetterAiLastEmail(email: string): Promise<void> {
  await setterAiCache.set<string>(LAST_EMAIL_KEY, normalizeEmail(email));
}

export async function getCachedSetterAiSessions(
  email: string,
): Promise<ChatSession[] | null> {
  return setterAiCache.get<ChatSession[]>(sessionsKey(email));
}

export function getHotCachedSetterAiSessions(
  email: string,
): ChatSession[] | null {
  return setterAiCache.peek<ChatSession[]>(sessionsKey(email)) ?? null;
}

export async function setCachedSetterAiSessions(
  email: string,
  sessions: ChatSession[],
): Promise<void> {
  await Promise.all([
    setterAiCache.set<ChatSession[]>(sessionsKey(email), sessions),
    setterAiCache.set<number>(sessionsTimestampKey(email), Date.now()),
  ]);
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
  await Promise.all([
    setterAiCache.set<Message[]>(messagesKey(email, sessionId), messages),
    setterAiCache.set<number>(
      messagesTimestampKey(email, sessionId),
      Date.now(),
    ),
  ]);
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

  if (!sessions) return;

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
      .filter((session, index, list) => {
        if (session.id !== toSession.id) return true;
        const firstIndex = list.findIndex((entry) => entry.id === toSession.id);
        return index === firstIndex || !hasTarget;
      });
    await setCachedSetterAiSessions(normalizedEmail, nextSessions);
  }

  if (fromMessages) {
    await Promise.all([
      setterAiCache.set<Message[]>(
        messagesKey(normalizedEmail, toSession.id),
        fromMessages,
      ),
      setterAiCache.delete(messagesKey(normalizedEmail, fromSessionId)),
    ]);
  }

  if (typeof fromMessagesTimestamp === "number") {
    await Promise.all([
      setterAiCache.set<number>(
        messagesTimestampKey(normalizedEmail, toSession.id),
        fromMessagesTimestamp,
      ),
      setterAiCache.delete(
        messagesTimestampKey(normalizedEmail, fromSessionId),
      ),
    ]);
  }
}

export async function getDeletedSetterAiSessionIds(
  email: string,
): Promise<string[]> {
  const normalizedEmail = normalizeEmail(email);
  const key = deletedSessionsKey(normalizedEmail);
  const tombstones =
    (await setterAiCache.get<DeletedSessionTombstones>(key)) ?? {};
  const pruned = pruneDeletedTombstones(tombstones);

  if (Object.keys(pruned).length !== Object.keys(tombstones).length) {
    await setterAiCache.set<DeletedSessionTombstones>(key, pruned);
  }

  return Object.keys(pruned);
}

export async function markDeletedSetterAiSessionId(
  email: string,
  sessionId: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const key = deletedSessionsKey(normalizedEmail);
  await setterAiCache.update<DeletedSessionTombstones>(key, (current) => {
    const pruned = pruneDeletedTombstones(current ?? {});
    pruned[sessionId] = Date.now();
    return pruned;
  });
}

export async function unmarkDeletedSetterAiSessionId(
  email: string,
  sessionId: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const key = deletedSessionsKey(normalizedEmail);
  await setterAiCache.update<DeletedSessionTombstones>(key, (current) => {
    const pruned = pruneDeletedTombstones(current ?? {});
    delete pruned[sessionId];
    return pruned;
  });
}
