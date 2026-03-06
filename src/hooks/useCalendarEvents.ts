import { useEffect, useRef, useState } from "react";
import {
  type CalendarIsoRange,
  getCachedCalendarCallsForRange,
  subscribeCachedCalendarCallsWorkspaceState,
} from "@/lib/cache";
import { warmCalendarRangesToCache } from "@/lib/calendar/cacheWarmup";
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

export function useCalendarEvents(
  input: UseCalendarEventsInput,
): UseCalendarEventsResult {
  const [events, setEvents] = useState<WorkspaceCalendarCallEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cacheRevision, setCacheRevision] = useState(0);
  const cacheRevisionRef = useRef(cacheRevision);

  useEffect(() => {
    cacheRevisionRef.current = cacheRevision;
  }, [cacheRevision]);

  useEffect(() => {
    return subscribeCachedCalendarCallsWorkspaceState(() => {
      setCacheRevision((prev) => prev + 1);
    });
  }, []);

  useEffect(() => {
    if (!input.enabled) {
      setEvents([]);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    let active = true;
    const loadRevision = cacheRevision;

    (async () => {
      let hasCachedData = false;
      try {
        const cachedRange = await getCachedCalendarCallsForRange({
          fromIso: input.fromIso,
          toIso: input.toIso,
        });
        if (!active || loadRevision !== cacheRevisionRef.current) return;

        hasCachedData = cachedRange.events.length > 0;
        setEvents(cachedRange.events);
        setError("");

        const targetRange: CalendarIsoRange = {
          fromIso: input.fromIso,
          toIso: input.toIso,
        };
        setLoading(!hasCachedData);
        const fetchedEvents = await warmCalendarRangesToCache({
          ranges: [targetRange],
          signal: controller.signal,
        });
        if (!active || loadRevision !== cacheRevisionRef.current) return;
        if (fetchedEvents.length === 0) {
          setLoading(false);
          setError("");
          return;
        }

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

          await warmCalendarRangesToCache({
            ranges: lookaheadTargets,
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
  }, [cacheRevision, input.enabled, input.fromIso, input.toIso]);

  return { events, loading, error };
}
