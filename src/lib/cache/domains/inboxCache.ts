"use client";

import { createLayeredCache } from "@/lib/cache/core/layeredCache";
import {
  applyConversationDetailsLocalPatch,
  type ConversationDetailsCacheRecord,
  type ConversationDetailsCacheState,
  type ConversationDetailsPendingPatch,
  clearSyncedConversationDetailsPending,
  mergeRemoteConversationDetails,
  readConversationDetailsCacheState,
  toConversationDetailsCacheRecord,
} from "@/lib/cache/domains/inboxConversationDetailsState";
import { APP_CACHE_STORES } from "@/lib/cache/idb/appDb";
import type {
  ConversationCallEvent,
  WorkspaceCalendarCallEvent,
} from "@/types/calendly";
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
const CONVERSATION_CALLS_CACHE_PREFIX = "conversation_calls_";
const CALENDAR_CALLS_CACHE_KEY = "calendar_calls_workspace";

export interface ConversationSummaryCacheRecord {
  summary: ConversationSummary | null;
  fetchedAt: number;
}

export interface MessagePageMetaCacheRecord {
  nextCursor: string | null;
  hasMore: boolean;
  fetchedAt: number;
}

export interface ConversationCallsCacheRecord {
  calls: ConversationCallEvent[];
  fetchedAt: number;
}

export interface CalendarCallsRangeCoverage {
  fromIso: string;
  toIso: string;
  fetchedAt: number;
}

export interface CalendarCallsWorkspaceCacheRecord {
  events: WorkspaceCalendarCallEvent[];
  coveredRanges: CalendarCallsRangeCoverage[];
  updatedAt: number;
}

export interface CalendarIsoRange {
  fromIso: string;
  toIso: string;
}

export type { ConversationDetailsCacheState };

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

function conversationCallsKey(conversationId: string): string {
  return `${CONVERSATION_CALLS_CACHE_PREFIX}${conversationId}`;
}

function normalizeIsoOrEmpty(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) return "";
  return parsed.toISOString();
}

function mergeCallsById<T extends { id: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const merged = new Map<string, T>();
  for (const item of existing) {
    merged.set(item.id, item);
  }
  for (const item of incoming) {
    merged.set(item.id, item);
  }
  return Array.from(merged.values());
}

function isRangeCovered(
  coveredRanges: CalendarCallsRangeCoverage[],
  fromIso: string,
  toIso: string,
): boolean {
  const targetFrom = Date.parse(fromIso);
  const targetTo = Date.parse(toIso);
  if (
    !Number.isFinite(targetFrom) ||
    !Number.isFinite(targetTo) ||
    targetFrom >= targetTo
  ) {
    return false;
  }

  return coveredRanges.some((range) => {
    const rangeFrom = Date.parse(range.fromIso);
    const rangeTo = Date.parse(range.toIso);
    if (
      !Number.isFinite(rangeFrom) ||
      !Number.isFinite(rangeTo) ||
      rangeFrom >= rangeTo
    ) {
      return false;
    }
    return rangeFrom <= targetFrom && rangeTo >= targetTo;
  });
}

function normalizeRange(input: CalendarIsoRange): CalendarIsoRange | null {
  const fromIso = normalizeIsoOrEmpty(input.fromIso);
  const toIso = normalizeIsoOrEmpty(input.toIso);
  if (!fromIso || !toIso) return null;

  const fromMs = Date.parse(fromIso);
  const toMs = Date.parse(toIso);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) {
    return null;
  }

  return { fromIso, toIso };
}

function toMsRange(range: CalendarIsoRange): { fromMs: number; toMs: number } {
  return {
    fromMs: Date.parse(range.fromIso),
    toMs: Date.parse(range.toIso),
  };
}

function toIsoRange(range: { fromMs: number; toMs: number }): CalendarIsoRange {
  return {
    fromIso: new Date(range.fromMs).toISOString(),
    toIso: new Date(range.toMs).toISOString(),
  };
}

type StoredConversationDetails =
  | ConversationDetails
  | ConversationDetailsCacheRecord;

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
  const state = await getCachedConversationDetailsState(conversationId);
  return state?.details ?? null;
}

export async function getCachedConversationDetailsState(
  conversationId: string,
): Promise<ConversationDetailsCacheState | null> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return null;
  const value = await inboxCache.get<StoredConversationDetails>(
    conversationDetailsKey(normalized),
  );
  return readConversationDetailsCacheState(value);
}

export function getHotCachedConversationDetails(
  conversationId: string,
): ConversationDetails | null {
  const state = getHotCachedConversationDetailsState(conversationId);
  return state?.details ?? null;
}

export function getHotCachedConversationDetailsState(
  conversationId: string,
): ConversationDetailsCacheState | null {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return null;
  const value =
    inboxCache.peek<StoredConversationDetails>(
      conversationDetailsKey(normalized),
    ) ?? null;
  return readConversationDetailsCacheState(value);
}

async function setConversationDetailsState(
  conversationId: string,
  state: ConversationDetailsCacheState,
): Promise<void> {
  await inboxCache.set<ConversationDetailsCacheRecord>(
    conversationDetailsKey(conversationId),
    toConversationDetailsCacheRecord(state),
  );
}

export async function setCachedConversationDetails(
  conversationId: string,
  details: ConversationDetails,
): Promise<void> {
  await setCachedConversationDetailsFromRemote(conversationId, details);
}

export async function setCachedConversationDetailsFromRemote(
  conversationId: string,
  details: ConversationDetails,
): Promise<ConversationDetailsCacheState> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) {
    return {
      details,
      pending: {},
    };
  }

  const currentState = await getCachedConversationDetailsState(normalized);
  const nextState = mergeRemoteConversationDetails(currentState, details);
  await setConversationDetailsState(normalized, nextState);
  return nextState;
}

export async function setCachedConversationDetailsLocal(
  conversationId: string,
  patch: ConversationDetailsPendingPatch,
): Promise<ConversationDetailsCacheState | null> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return null;

  const currentState = await getCachedConversationDetailsState(normalized);
  const nextState = applyConversationDetailsLocalPatch(currentState, patch);
  await setConversationDetailsState(normalized, nextState);
  return nextState;
}

export async function markCachedConversationDetailsSynced(
  conversationId: string,
  syncedPatch: ConversationDetailsPendingPatch,
): Promise<ConversationDetailsCacheState | null> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return null;

  const currentState = await getCachedConversationDetailsState(normalized);
  const nextState = clearSyncedConversationDetailsPending(
    currentState,
    syncedPatch,
  );
  await setConversationDetailsState(normalized, nextState);
  return nextState;
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

export async function getCachedConversationCalls(
  conversationId: string,
): Promise<ConversationCallsCacheRecord | null> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return null;
  return inboxCache.get<ConversationCallsCacheRecord>(
    conversationCallsKey(normalized),
  );
}

export function getHotCachedConversationCalls(
  conversationId: string,
): ConversationCallsCacheRecord | null {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return null;
  return (
    inboxCache.peek<ConversationCallsCacheRecord>(
      conversationCallsKey(normalized),
    ) ?? null
  );
}

export async function setCachedConversationCalls(
  conversationId: string,
  calls: ConversationCallEvent[],
): Promise<void> {
  const normalized = normalizeConversationId(conversationId);
  if (!normalized) return;
  const deduped = mergeCallsById([], calls);
  await inboxCache.set<ConversationCallsCacheRecord>(
    conversationCallsKey(normalized),
    {
      calls: deduped,
      fetchedAt: Date.now(),
    },
  );
}

export async function getCachedCalendarCallsWorkspaceState(): Promise<CalendarCallsWorkspaceCacheRecord | null> {
  return inboxCache.get<CalendarCallsWorkspaceCacheRecord>(
    CALENDAR_CALLS_CACHE_KEY,
  );
}

export function getHotCachedCalendarCallsWorkspaceState(): CalendarCallsWorkspaceCacheRecord | null {
  return (
    inboxCache.peek<CalendarCallsWorkspaceCacheRecord>(
      CALENDAR_CALLS_CACHE_KEY,
    ) ?? null
  );
}

export async function getCachedCalendarCallsForRange(input: {
  fromIso: string;
  toIso: string;
}): Promise<{
  events: WorkspaceCalendarCallEvent[];
  covered: boolean;
  updatedAt: number | null;
}> {
  const fromIso = normalizeIsoOrEmpty(input.fromIso);
  const toIso = normalizeIsoOrEmpty(input.toIso);
  const state = await getCachedCalendarCallsWorkspaceState();
  if (!state || !fromIso || !toIso) {
    return { events: [], covered: false, updatedAt: null };
  }

  const fromMs = Date.parse(fromIso);
  const toMs = Date.parse(toIso);
  const events = state.events.filter((event) => {
    const startMs = Date.parse(event.startTime);
    return Number.isFinite(startMs) && startMs >= fromMs && startMs < toMs;
  });

  return {
    events,
    covered: isRangeCovered(state.coveredRanges, fromIso, toIso),
    updatedAt: state.updatedAt,
  };
}

export async function getUncoveredCalendarCallRanges(
  input: CalendarIsoRange,
): Promise<CalendarIsoRange[]> {
  const normalizedTarget = normalizeRange(input);
  if (!normalizedTarget) return [];

  const state = await getCachedCalendarCallsWorkspaceState();
  if (!state || state.coveredRanges.length === 0) {
    return [normalizedTarget];
  }

  const targetMsRange = toMsRange(normalizedTarget);
  const clippedCoveredRanges = state.coveredRanges
    .map((range) =>
      normalizeRange({
        fromIso: range.fromIso,
        toIso: range.toIso,
      }),
    )
    .filter((range): range is CalendarIsoRange => Boolean(range))
    .map((range) => toMsRange(range))
    .map((range) => ({
      fromMs: Math.max(range.fromMs, targetMsRange.fromMs),
      toMs: Math.min(range.toMs, targetMsRange.toMs),
    }))
    .filter((range) => range.fromMs < range.toMs)
    .sort((a, b) => a.fromMs - b.fromMs);

  if (clippedCoveredRanges.length === 0) {
    return [normalizedTarget];
  }

  const mergedCovered: Array<{ fromMs: number; toMs: number }> = [];
  for (const range of clippedCoveredRanges) {
    const last = mergedCovered[mergedCovered.length - 1];
    if (!last || range.fromMs > last.toMs) {
      mergedCovered.push({ ...range });
      continue;
    }
    last.toMs = Math.max(last.toMs, range.toMs);
  }

  const uncovered: Array<{ fromMs: number; toMs: number }> = [];
  let cursor = targetMsRange.fromMs;
  for (const covered of mergedCovered) {
    if (cursor < covered.fromMs) {
      uncovered.push({ fromMs: cursor, toMs: covered.fromMs });
    }
    cursor = Math.max(cursor, covered.toMs);
  }
  if (cursor < targetMsRange.toMs) {
    uncovered.push({ fromMs: cursor, toMs: targetMsRange.toMs });
  }

  return uncovered.filter((range) => range.fromMs < range.toMs).map(toIsoRange);
}

export async function mergeCachedCalendarCallsForRange(input: {
  fromIso: string;
  toIso: string;
  events: WorkspaceCalendarCallEvent[];
}): Promise<void> {
  const fromIso = normalizeIsoOrEmpty(input.fromIso);
  const toIso = normalizeIsoOrEmpty(input.toIso);
  if (!fromIso || !toIso) return;

  await inboxCache.update<CalendarCallsWorkspaceCacheRecord>(
    CALENDAR_CALLS_CACHE_KEY,
    (current) => {
      const base: CalendarCallsWorkspaceCacheRecord = current ?? {
        events: [],
        coveredRanges: [],
        updatedAt: 0,
      };

      const mergedEvents = mergeCallsById(base.events, input.events);
      const nextRange: CalendarCallsRangeCoverage = {
        fromIso,
        toIso,
        fetchedAt: Date.now(),
      };
      return {
        events: mergedEvents,
        coveredRanges: [...base.coveredRanges, nextRange].slice(-50),
        updatedAt: Date.now(),
      };
    },
  );
}

export async function mergeCachedCalendarCallsFromConversation(
  calls: ConversationCallEvent[],
): Promise<void> {
  if (calls.length === 0) return;
  const workspaceEvents: WorkspaceCalendarCallEvent[] = calls.map((call) => ({
    ...call,
    leadName: call.inviteeName || call.inviteeEmail || "Unknown lead",
  }));

  await inboxCache.update<CalendarCallsWorkspaceCacheRecord>(
    CALENDAR_CALLS_CACHE_KEY,
    (current) => {
      const base: CalendarCallsWorkspaceCacheRecord = current ?? {
        events: [],
        coveredRanges: [],
        updatedAt: 0,
      };
      return {
        events: mergeCallsById(base.events, workspaceEvents),
        coveredRanges: base.coveredRanges,
        updatedAt: Date.now(),
      };
    },
  );
}

export async function mergeCachedConversationCallsFromWorkspace(
  events: WorkspaceCalendarCallEvent[],
): Promise<void> {
  const grouped = new Map<string, ConversationCallEvent[]>();

  for (const event of events) {
    const conversationId =
      typeof event.conversationId === "string"
        ? event.conversationId.trim()
        : "";
    if (!conversationId) continue;
    const list = grouped.get(conversationId) ?? [];
    list.push({
      id: event.id,
      conversationId: event.conversationId,
      eventType: event.eventType,
      status: event.status,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      timezone: event.timezone,
      joinUrl: event.joinUrl,
      cancelUrl: event.cancelUrl,
      rescheduleUrl: event.rescheduleUrl,
      inviteeName: event.inviteeName,
      inviteeEmail: event.inviteeEmail,
      calendlyEventUri: event.calendlyEventUri,
      calendlyInviteeUri: event.calendlyInviteeUri,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    });
    grouped.set(conversationId, list);
  }

  await Promise.all(
    Array.from(grouped.entries()).map(async ([conversationId, calls]) => {
      await inboxCache.update<ConversationCallsCacheRecord>(
        conversationCallsKey(conversationId),
        (current) => ({
          calls: mergeCallsById(current?.calls ?? [], calls),
          fetchedAt: Date.now(),
        }),
      );
    }),
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
      inboxCache.delete(conversationCallsKey(conversationId)),
    ]),
  );
}
