"use client";

import { getCalendarVisibleRange } from "@/components/calendar/calendarRange";
import {
  type CalendarIsoRange,
  getUncoveredCalendarCallRanges,
  mergeCachedCalendarCallsForRange,
  mergeCachedConversationCallsFromWorkspace,
} from "@/lib/cache";
import type { WorkspaceCalendarCallEvent } from "@/types/calendly";

export const CALENDAR_CACHE_WARMUP_LOOKAHEAD_MONTHS = 1;

function normalizeRangeKey(range: CalendarIsoRange): string {
  return `${range.fromIso}|${range.toIso}`;
}

function dedupeRanges(ranges: CalendarIsoRange[]): CalendarIsoRange[] {
  const unique = new Map<string, CalendarIsoRange>();
  for (const range of ranges) {
    unique.set(normalizeRangeKey(range), range);
  }
  return Array.from(unique.values());
}

export function getCalendarWarmupRanges(anchorDate: Date): CalendarIsoRange[] {
  const ranges: CalendarIsoRange[] = [];

  for (
    let offset = 0;
    offset <= CALENDAR_CACHE_WARMUP_LOOKAHEAD_MONTHS;
    offset += 1
  ) {
    const monthDate = new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth() + offset,
      1,
    );
    ranges.push(getCalendarVisibleRange(monthDate, "month"));
  }

  return ranges;
}

export async function fetchCalendarRange(input: {
  range: CalendarIsoRange;
  signal?: AbortSignal;
}): Promise<WorkspaceCalendarCallEvent[]> {
  const params = new URLSearchParams({
    from: input.range.fromIso,
    to: input.range.toIso,
  });
  const response = await fetch(`/api/calendar/events?${params.toString()}`, {
    cache: "no-store",
    signal: input.signal,
  });
  const data = (await response.json()) as {
    events?: WorkspaceCalendarCallEvent[];
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || "Failed to load calendar events.");
  }
  return Array.isArray(data.events) ? data.events : [];
}

export async function warmCalendarRangesToCache(input: {
  ranges: CalendarIsoRange[];
  signal?: AbortSignal;
}): Promise<WorkspaceCalendarCallEvent[]> {
  if (input.ranges.length === 0) return [];

  const uncoveredRanges = dedupeRanges(
    (
      await Promise.all(
        input.ranges.map((range) => getUncoveredCalendarCallRanges(range)),
      )
    ).flat(),
  );
  if (uncoveredRanges.length === 0) return [];

  const fetchedSlices = await Promise.all(
    uncoveredRanges.map((range) =>
      fetchCalendarRange({ range, signal: input.signal }),
    ),
  );

  await Promise.all(
    uncoveredRanges.map(async (range, index) => {
      await mergeCachedCalendarCallsForRange({
        fromIso: range.fromIso,
        toIso: range.toIso,
        events: fetchedSlices[index] ?? [],
      });
    }),
  );

  const fetchedEvents = fetchedSlices.flat();
  await mergeCachedConversationCallsFromWorkspace(fetchedEvents);
  return fetchedEvents;
}
