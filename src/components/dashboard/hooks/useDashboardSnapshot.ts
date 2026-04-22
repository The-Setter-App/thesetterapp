"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  detailIncludesDomain,
  subscribeSyncDomainsInvalidated,
} from "@/lib/sync/domainInvalidation";
import type { DashboardSnapshot } from "@/types/dashboard";

const DASHBOARD_REFRESH_DEBOUNCE_MS = 900;

export function useDashboardSnapshot(initialSnapshot: DashboardSnapshot) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const bootstrapStartedRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  const refreshSnapshot = useCallback(async () => {
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    try {
      const response = await fetch("/api/dashboard/snapshot", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(
          `Dashboard snapshot request failed with ${response.status}.`,
        );
      }

      const nextSnapshot = (await response.json()) as DashboardSnapshot;
      if (controller.signal.aborted) return;
      window.clearTimeout(refreshTimerRef.current ?? undefined);
      startTransition(() => {
        setSnapshot(nextSnapshot);
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      console.error(
        "[DashboardClient] Failed to refresh dashboard snapshot:",
        error,
      );
    }
  }, []);

  const scheduleRefresh = useCallback(
    (delayMs = DASHBOARD_REFRESH_DEBOUNCE_MS) => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        void refreshSnapshot();
      }, delayMs);
    },
    [refreshSnapshot],
  );

  useEffect(() => {
    return subscribeSyncDomainsInvalidated((detail) => {
      if (!detailIncludesDomain(detail, "dashboard")) return;
      scheduleRefresh();
    });
  }, [scheduleRefresh]);

  useEffect(() => {
    if (!snapshot.hasConnectedAccounts || bootstrapStartedRef.current) return;
    bootstrapStartedRef.current = true;

    void fetch("/api/dashboard/bootstrap", {
      method: "POST",
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Dashboard bootstrap request failed with ${response.status}.`,
          );
        }
        scheduleRefresh(0);
      })
      .catch((error) => {
        console.error(
          "[DashboardClient] Failed to bootstrap dashboard data:",
          error,
        );
      });
  }, [scheduleRefresh, snapshot.hasConnectedAccounts]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleRefresh(0);
      }
    };

    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      inFlightRef.current?.abort();
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [scheduleRefresh]);

  return snapshot;
}
