"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  getCalendarWarmupRanges,
  warmCalendarRangesToCache,
} from "@/lib/calendar/cacheWarmup";
import { parseCalendarPathname } from "@/lib/calendarRoute";

interface CalendarCacheWarmupWorkerProps {
  enabled: boolean;
}

interface CalendlyConnectionStateResponse {
  connected?: boolean;
}

const CALENDAR_CONNECTION_STATE_TTL_MS = 60 * 1000;
const CALENDAR_BACKGROUND_REFRESH_MS = 60 * 1000;

function resolveCalendarAnchorDate(pathname: string | null): Date {
  return parseCalendarPathname(pathname) ?? new Date();
}

async function fetchCalendlyConnectionState(
  signal: AbortSignal,
): Promise<boolean> {
  const response = await fetch("/api/inbox/calendly/connection-state", {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `Calendly connection state request failed with ${response.status}.`,
    );
  }
  const data = (await response.json()) as CalendlyConnectionStateResponse;
  return Boolean(data.connected);
}

export default function CalendarCacheWarmupWorker({
  enabled,
}: CalendarCacheWarmupWorkerProps) {
  const pathname = usePathname();
  const inFlightRef = useRef<Promise<void>>(Promise.resolve());
  const controllerRef = useRef<AbortController | null>(null);
  const connectionRef = useRef<{
    checkedAt: number;
    connected: boolean;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    const runWarmup = () => {
      inFlightRef.current = inFlightRef.current
        .catch(() => undefined)
        .then(async () => {
          controllerRef.current?.abort();
          const controller = new AbortController();
          controllerRef.current = controller;
          const cachedConnection = connectionRef.current;
          const connectionIsFresh =
            cachedConnection &&
            Date.now() - cachedConnection.checkedAt <
              CALENDAR_CONNECTION_STATE_TTL_MS;

          let connected = cachedConnection?.connected ?? false;
          if (!connectionIsFresh) {
            connected = await fetchCalendlyConnectionState(controller.signal);
            connectionRef.current = {
              checkedAt: Date.now(),
              connected,
            };
          }
          if (!active || !connected) return;

          await warmCalendarRangesToCache({
            ranges: getCalendarWarmupRanges(
              resolveCalendarAnchorDate(pathname),
            ),
            signal: controller.signal,
          });
        })
        .catch((error) => {
          if (!active) return;
          if ((error as Error).name === "AbortError") return;
          console.error("[CalendarCacheWarmupWorker] Warmup failed:", error);
        })
        .finally(() => {
          if (controllerRef.current?.signal.aborted) {
            controllerRef.current = null;
          }
        });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runWarmup();
      }
    };

    runWarmup();
    window.addEventListener("focus", runWarmup);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        runWarmup();
      }
    }, CALENDAR_BACKGROUND_REFRESH_MS);

    return () => {
      active = false;
      controllerRef.current?.abort();
      window.removeEventListener("focus", runWarmup);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [enabled, pathname]);

  return null;
}
