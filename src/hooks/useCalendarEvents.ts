import { useEffect, useState } from "react";
import {
  type CalendarIsoRange,
  getCachedCalendarCallsForRange,
  getUncoveredCalendarCallRanges,
  mergeCachedCalendarCallsForRange,
  mergeCachedConversationCallsFromWorkspace,
} from "@/lib/cache";
import type { WorkspaceCalendarCallEvent } from "@/types/calendly";

interface UseCalendarEventsInput {
  enabled: boolean;
  fromIso: string;
  toIso: string;
}

interface UseCalendarEventsResult {
  events: WorkspaceCalendarCallEvent[];
  loading: boolean;
  error: string;
}

function mergeEventsById(
  existing: WorkspaceCalendarCallEvent[],
  incoming: WorkspaceCalendarCallEvent[],
): WorkspaceCalendarCallEvent[] {
  const map = new Map<string, WorkspaceCalendarCallEvent>();
  for (const event of existing) {
    map.set(event.id, event);
  }
  for (const event of incoming) {
    map.set(event.id, event);
  }
  return Array.from(map.values());
}

function toIsoFromMs(value: number): string {
  return new Date(value).toISOString();
}

async function fetchCalendarRange(input: {
  range: CalendarIsoRange;
  signal: AbortSignal;
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

async function fetchAndCacheRanges(input: {
  ranges: CalendarIsoRange[];
  signal: AbortSignal;
}): Promise<WorkspaceCalendarCallEvent[]> {
  if (input.ranges.length === 0) return [];

  const fetchedSlices = await Promise.all(
    input.ranges.map((range) =>
      fetchCalendarRange({ range, signal: input.signal }),
    ),
  );
  const fetchedEvents = fetchedSlices.flat();

  await Promise.all(
    input.ranges.map(async (range, index) => {
      await mergeCachedCalendarCallsForRange({
        fromIso: range.fromIso,
        toIso: range.toIso,
        events: fetchedSlices[index] ?? [],
      });
    }),
  );
  await mergeCachedConversationCallsFromWorkspace(fetchedEvents);
  return fetchedEvents;
}

export function useCalendarEvents(
  input: UseCalendarEventsInput,
): UseCalendarEventsResult {
  const [events, setEvents] = useState<WorkspaceCalendarCallEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!input.enabled) {
      setEvents([]);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    let active = true;

    (async () => {
      let hasCachedData = false;
      try {
        const cachedRange = await getCachedCalendarCallsForRange({
          fromIso: input.fromIso,
          toIso: input.toIso,
        });
        if (!active) return;

        hasCachedData = cachedRange.events.length > 0;
        setEvents(cachedRange.events);
        setError("");

        const targetRange: CalendarIsoRange = {
          fromIso: input.fromIso,
          toIso: input.toIso,
        };
        const uncoveredRanges =
          await getUncoveredCalendarCallRanges(targetRange);
        if (!active) return;
        if (uncoveredRanges.length === 0) {
          setLoading(false);
          setError("");
          return;
        }

        setLoading(!hasCachedData);
        const fetchedEvents = await fetchAndCacheRanges({
          ranges: uncoveredRanges,
          signal: controller.signal,
        });
        if (!active) return;

        const merged = mergeEventsById(cachedRange.events, fetchedEvents);
        setEvents(merged);
        setError("");

        // Warm cache for future navigation so adjacent months are instant.
        const fromMs = Date.parse(targetRange.fromIso);
        const toMs = Date.parse(targetRange.toIso);
        const spanMs = toMs - fromMs;
        if (Number.isFinite(spanMs) && spanMs > 0) {
          const lookaheadTargets: CalendarIsoRange[] = [
            {
              fromIso: toIsoFromMs(toMs),
              toIso: toIsoFromMs(toMs + spanMs),
            },
            {
              fromIso: toIsoFromMs(toMs + spanMs),
              toIso: toIsoFromMs(toMs + spanMs * 2),
            },
          ];

          const uncoveredLookaheads = (
            await Promise.all(
              lookaheadTargets.map((range) =>
                getUncoveredCalendarCallRanges(range),
              ),
            )
          ).flat();

          if (!active || uncoveredLookaheads.length === 0) return;
          await fetchAndCacheRanges({
            ranges: uncoveredLookaheads,
            signal: controller.signal,
          });
        }
      } catch (loadError) {
        if (!active || controller.signal.aborted) return;
        if (!hasCachedData) {
          setEvents([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load calendar events.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [input.enabled, input.fromIso, input.toIso]);

  return { events, loading, error };
}
