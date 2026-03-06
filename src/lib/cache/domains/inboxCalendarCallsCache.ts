"use client";

import type {
  ConversationCallEvent,
  WorkspaceCalendarCallEvent,
} from "@/types/calendly";
import {
  CALENDAR_CALLS_CACHE_KEY,
  CALENDAR_CALLS_COVERAGE_STALE_MS,
  calendarEventDetailKey,
  conversationCallsKey,
  inboxCache,
  mergeCallsById,
  normalizeIsoOrEmpty,
} from "./inboxCacheShared";

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

export interface CalendarEventDetailCacheRecord {
  event: WorkspaceCalendarCallEvent;
  fetchedAt: number;
}

export interface CalendarIsoRange {
  fromIso: string;
  toIso: string;
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
    const fetchedAt = typeof range.fetchedAt === "number" ? range.fetchedAt : 0;
    if (Date.now() - fetchedAt > CALENDAR_CALLS_COVERAGE_STALE_MS) {
      return false;
    }
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

function emptyWorkspaceState(): CalendarCallsWorkspaceCacheRecord {
  return {
    events: [],
    coveredRanges: [],
    updatedAt: 0,
  };
}

function toConversationCallEvent(
  event: WorkspaceCalendarCallEvent,
): ConversationCallEvent {
  return {
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
    preCallAnswers: event.preCallAnswers,
    preCallAnswersStatus: event.preCallAnswersStatus,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

export async function getCachedCalendarCallsWorkspaceState(): Promise<CalendarCallsWorkspaceCacheRecord | null> {
  return inboxCache.get<CalendarCallsWorkspaceCacheRecord>(
    CALENDAR_CALLS_CACHE_KEY,
  );
}

export function subscribeCachedCalendarCallsWorkspaceState(
  listener: () => void,
): () => void {
  return inboxCache.subscribe(CALENDAR_CALLS_CACHE_KEY, listener);
}

export async function getCachedCalendarEventDetail(
  eventId: string,
): Promise<CalendarEventDetailCacheRecord | null> {
  const normalized = eventId.trim();
  if (!normalized) return null;
  return inboxCache.get<CalendarEventDetailCacheRecord>(
    calendarEventDetailKey(normalized),
  );
}

export function subscribeCachedCalendarEventDetail(
  eventId: string,
  listener: () => void,
): () => void {
  const normalized = eventId.trim();
  if (!normalized) {
    return () => undefined;
  }
  return inboxCache.subscribe(calendarEventDetailKey(normalized), listener);
}

export function getHotCachedCalendarEventDetail(
  eventId: string,
): CalendarEventDetailCacheRecord | null {
  const normalized = eventId.trim();
  if (!normalized) return null;
  return (
    inboxCache.peek<CalendarEventDetailCacheRecord>(
      calendarEventDetailKey(normalized),
    ) ?? null
  );
}

export async function setCachedCalendarEventDetail(
  eventId: string,
  event: WorkspaceCalendarCallEvent,
): Promise<void> {
  const normalized = eventId.trim();
  if (!normalized) return;

  await inboxCache.set<CalendarEventDetailCacheRecord>(
    calendarEventDetailKey(normalized),
    {
      event,
      fetchedAt: Date.now(),
    },
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
      const base = current ?? emptyWorkspaceState();
      const nextRange: CalendarCallsRangeCoverage = {
        fromIso,
        toIso,
        fetchedAt: Date.now(),
      };
      return {
        events: mergeCallsById(base.events, input.events),
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

  await Promise.all(
    workspaceEvents.map((event) =>
      setCachedCalendarEventDetail(event.id, event),
    ),
  );

  await inboxCache.update<CalendarCallsWorkspaceCacheRecord>(
    CALENDAR_CALLS_CACHE_KEY,
    (current) => {
      const base = current ?? emptyWorkspaceState();
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
    list.push(toConversationCallEvent(event));
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

export async function mergeCachedCalendarEventDetail(
  event: WorkspaceCalendarCallEvent,
): Promise<void> {
  await setCachedCalendarEventDetail(event.id, event);

  await inboxCache.update<CalendarCallsWorkspaceCacheRecord>(
    CALENDAR_CALLS_CACHE_KEY,
    (current) => {
      const base = current ?? emptyWorkspaceState();
      return {
        ...base,
        events: mergeCallsById(base.events, [event]),
        updatedAt: Date.now(),
      };
    },
  );

  if (event.conversationId?.trim()) {
    await inboxCache.update<ConversationCallsCacheRecord>(
      conversationCallsKey(event.conversationId),
      (current) => ({
        calls: mergeCallsById(current?.calls ?? [], [
          toConversationCallEvent(event),
        ]),
        fetchedAt: Date.now(),
      }),
    );
  }
}
