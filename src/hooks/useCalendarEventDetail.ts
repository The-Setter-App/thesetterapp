"use client";

import { useEffect, useState } from "react";
import {
  getCachedCalendarEventDetail,
  mergeCachedCalendarEventDetail,
} from "@/lib/cache";
import type { WorkspaceCalendarCallEvent } from "@/types/calendly";

interface UseCalendarEventDetailInput {
  enabled: boolean;
  eventId: string | null;
}

interface UseCalendarEventDetailResult {
  eventDetail: WorkspaceCalendarCallEvent | null;
  loading: boolean;
  error: string;
}

export function useCalendarEventDetail(
  input: UseCalendarEventDetailInput,
): UseCalendarEventDetailResult {
  const [eventDetail, setEventDetail] =
    useState<WorkspaceCalendarCallEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const eventId = input.eventId?.trim() || "";
    if (!input.enabled || !eventId) {
      setEventDetail(null);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    let active = true;

    (async () => {
      let hasCachedData = false;
      try {
        const cached = await getCachedCalendarEventDetail(eventId);
        if (!active) return;

        if (cached?.event) {
          hasCachedData = true;
          setEventDetail(cached.event);
        } else {
          setEventDetail(null);
        }
        setError("");
        setLoading(!hasCachedData);

        const response = await fetch(
          `/api/calendar/events/${encodeURIComponent(eventId)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = (await response.json()) as {
          event?: WorkspaceCalendarCallEvent;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load event details.");
        }

        if (!active || !data.event) return;
        await mergeCachedCalendarEventDetail(data.event);
        if (!active) return;

        setEventDetail(data.event);
        setError("");
      } catch (loadError) {
        if (!active || controller.signal.aborted) return;
        if (!hasCachedData) {
          setEventDetail(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load event details.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [input.enabled, input.eventId]);

  return { eventDetail, loading, error };
}
