"use client";

import { createLayeredCache } from "@/lib/cache/core/layeredCache";
import { APP_CACHE_STORES } from "@/lib/cache/idb/appDb";
import type {
  ConversationDetails,
  ConversationSummary,
  Message,
  User,
} from "@/types/inbox";

const USERS_CACHE_KEY = "users";
const MESSAGES_CACHE_PREFIX = "messages_";
const MESSAGES_META_CACHE_PREFIX = "messages_page_meta_";
const CONVERSATION_DETAILS_CACHE_PREFIX = "conversation_details_";
const CONVERSATION_SUMMARY_CACHE_PREFIX = "conversation_summary_";

export interface ConversationSummaryCacheRecord {
  summary: ConversationSummary | null;
  fetchedAt: number;
}

export interface MessagePageMetaCacheRecord {
  nextCursor: string | null;
  hasMore: boolean;
  fetchedAt: number;
}

const inboxCache = createLayeredCache({
  storeName: APP_CACHE_STORES.inbox,
  logLabel: "InboxCache",
  writeDebounceMs: 50,
});

function normalizeConversationId(conversationId: string): string {
  return conversationId.trim();
}

function messagesKey(conversationId: string): string {
  return `${MESSAGES_CACHE_PREFIX}${conversationId}`;
}

function messageMetaKey(conversationId: string): string {
  return `${MESSAGES_META_CACHE_PREFIX}${conversationId}`;
}

function conversationDetailsKey(conversationId: string): string {
  return `${CONVERSATION_DETAILS_CACHE_PREFIX}${conversationId}`;
}

function conversationSummaryKey(conversationId: string): string {
  return `${CONVERSATION_SUMMARY_CACHE_PREFIX}${conversationId}`;
}

export async function getCachedUsers(): Promise<User[] | null> {
  return inboxCache.get<User[]>(USERS_CACHE_KEY);
}

export function getHotCachedUsers(): User[] | null {
  return inboxCache.peek<User[]>(USERS_CACHE_KEY) ?? null;
}

export async function setCachedUsers(users: User[]): Promise<void> {
  await inboxCache.set<User[]>(USERS_CACHE_KEY, users);
}

export async function getCachedMessages(
  conversationId: string,
): Promise<Message[] | null> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return null;
  return inboxCache.get<Message[]>(messagesKey(normalized));
}

export function getHotCachedMessages(conversationId: string): Message[] | null {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return null;
  return inboxCache.peek<Message[]>(messagesKey(normalized)) ?? null;
}

export async function setCachedMessages(
  conversationId: string,
  messages: Message[],
): Promise<void> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return;
  await inboxCache.set<Message[]>(messagesKey(normalized), messages);
}

export async function getCachedMessagePageMeta(
  conversationId: string,
): Promise<MessagePageMetaCacheRecord | null> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return null;
  return inboxCache.get<MessagePageMetaCacheRecord>(messageMetaKey(normalized));
}

export function getHotCachedMessagePageMeta(
  conversationId: string,
): MessagePageMetaCacheRecord | null {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return null;
  return (
    inboxCache.peek<MessagePageMetaCacheRecord>(messageMetaKey(normalized)) ??
    null
  );
}

export async function setCachedMessagePageMeta(
  conversationId: string,
  meta: MessagePageMetaCacheRecord,
): Promise<void> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return;
  await inboxCache.set<MessagePageMetaCacheRecord>(
    messageMetaKey(normalized),
    meta,
  );
}

export async function updateCachedMessages(
  conversationId: string,
  updater: (current: Message[] | null) => Message[],
): Promise<void> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return;
  await inboxCache.update<Message[]>(messagesKey(normalized), updater);
}

export async function getCachedConversationDetails(
  conversationId: string,
): Promise<ConversationDetails | null> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return null;
  return inboxCache.get<ConversationDetails>(
    conversationDetailsKey(normalized),
  );
}

export function getHotCachedConversationDetails(
  conversationId: string,
): ConversationDetails | null {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return null;
  return (
    inboxCache.peek<ConversationDetails>(conversationDetailsKey(normalized)) ??
    null
  );
}

export async function setCachedConversationDetails(
  conversationId: string,
  details: ConversationDetails,
): Promise<void> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return;
  await inboxCache.set<ConversationDetails>(
    conversationDetailsKey(normalized),
    details,
  );
}

export async function getCachedConversationSummary(
  conversationId: string,
): Promise<ConversationSummaryCacheRecord | null> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return null;
  return inboxCache.get<ConversationSummaryCacheRecord>(
    conversationSummaryKey(normalized),
  );
}

export async function setCachedConversationSummary(
  conversationId: string,
  summary: ConversationSummary | null,
): Promise<void> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return;
  await inboxCache.set<ConversationSummaryCacheRecord>(
    conversationSummaryKey(normalized),
    {
      summary,
      fetchedAt: Date.now(),
    },
  );
}

export async function removeCachedConversationsByAccount(
  accountId: string,
): Promise<void> {
  const normalizedAccountId = accountId.trim();
  if (!normalizedAccountId) return;

  const users = await getCachedUsers();
  if (!users || users.length === 0) return;

  const removedConversationIds = users
    .filter((user) => user.accountId === normalizedAccountId)
    .map((user) => normalizeConversationId(user.id))
    .filter((conversationId) => conversationId.length > 0);

  if (removedConversationIds.length === 0) return;

  const nextUsers = users.filter(
    (user) => user.accountId !== normalizedAccountId,
  );
  await setCachedUsers(nextUsers);

  const uniqueConversationIds = Array.from(new Set(removedConversationIds));
  await Promise.all(
    uniqueConversationIds.flatMap((conversationId) => [
      inboxCache.delete(messagesKey(conversationId)),
      inboxCache.delete(messageMetaKey(conversationId)),
      inboxCache.delete(conversationDetailsKey(conversationId)),
      inboxCache.delete(conversationSummaryKey(conversationId)),
    ]),
  );
}
