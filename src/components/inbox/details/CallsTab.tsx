"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LuCalendar, LuGlobe, LuVideo } from "react-icons/lu";
import CallsTabSkeleton from "@/components/inbox/details/CallsTabSkeleton";
import {
  getConversationCallsCacheSnapshot,
  refreshConversationCallsCache,
} from "@/lib/inbox/callsClientCache";
import { INBOX_SSE_EVENT } from "@/lib/inbox/clientRealtimeEvents";
import type { ConversationCallEvent } from "@/types/calendly";
import type { SSEEvent } from "@/types/inbox";

interface CallsTabProps {
  conversationId: string;
  connectionLoading: boolean;
  calendlyConnected: boolean;
  canManageCalendlyIntegration: boolean;
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "Unknown time";
  }
  return `${startDate.toLocaleString([], {
    hour: "numeric",
    minute: "2-digit",
    month: "long",
    day: "numeric",
    year: "numeric",
  })} - ${endDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export default function CallsTab({
  conversationId,
  connectionLoading,
  calendlyConnected,
  canManageCalendlyIntegration,
}: CallsTabProps) {
  const [calls, setCalls] = useState<ConversationCallEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refreshCalls = useCallback(async () => {
    const nextCalls = await refreshConversationCallsCache(conversationId);
    setCalls(nextCalls);
    setError("");
  }, [conversationId]);

  useEffect(() => {
    if (connectionLoading) {
      setLoading(true);
      setError("");
      return;
    }

    if (!calendlyConnected) {
      setCalls([]);
      setLoading(false);
      setError("");
      return;
    }

    let active = true;
    const controller = new AbortController();

    (async () => {
      let hasFallbackData = false;
      try {
        const cached = await getConversationCallsCacheSnapshot(conversationId);
        if (!active) return;

        if (cached.exists) {
          setCalls(cached.calls);
          hasFallbackData = cached.calls.length > 0;
        }

        const shouldFetch = !cached.exists || !cached.fresh;
        if (!shouldFetch) {
          setLoading(false);
          setError("");
          return;
        }

        setLoading(!cached);
        setError("");

        const nextCalls = await refreshConversationCallsCache(
          conversationId,
          controller.signal,
        );
        if (!active) return;

        setCalls(nextCalls);
      } catch (loadError) {
        if (!active || controller.signal.aborted) return;
        if (!hasFallbackData) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load calls.",
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
  }, [conversationId, calendlyConnected, connectionLoading]);

  useEffect(() => {
    if (connectionLoading || !calendlyConnected) return;

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<SSEEvent>;
      const message = customEvent.detail;
      if (!message || message.type !== "calendly_call_updated") return;
      if (message.data.conversationId !== conversationId) return;

      refreshCalls().catch((refreshError) => {
        console.error(
          "[CallsTab] Failed to refresh after Calendly update:",
          refreshError,
        );
      });
    };

    window.addEventListener(INBOX_SSE_EVENT, handler);
    return () => window.removeEventListener(INBOX_SSE_EVENT, handler);
  }, [calendlyConnected, connectionLoading, conversationId, refreshCalls]);

  const sortedCalls = useMemo(
    () =>
      [...calls].sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      ),
    [calls],
  );

  if (connectionLoading) {
    return <CallsTabSkeleton />;
  }

  if (!calendlyConnected) {
    return (
      <div className="h-full overflow-y-auto bg-white p-5">
        <div className="rounded-2xl bg-[#F8F7FF] p-5">
          <p className="text-sm font-semibold text-[#101011]">
            Calendly integration required
          </p>
          <p className="mt-1 text-[0.8125rem] leading-snug text-[#606266]">
            {canManageCalendlyIntegration
              ? "Connect Calendly in Settings > Integration to sync calls here."
              : "Ask the team owner to set up Calendly in Settings > Integration."}
          </p>
          {canManageCalendlyIntegration ? (
            <a
              href="/settings/integration"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#8771FF] px-4 text-xs font-semibold text-white transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-[#6d5ed6]"
            >
              Open Integration Settings
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  if (loading) {
    return <CallsTabSkeleton />;
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto bg-white p-5">
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      </div>
    );
  }

  if (sortedCalls.length === 0) {
    return (
      <div className="h-full overflow-y-auto bg-white p-5">
        <div className="rounded-2xl bg-[#F8F7FF] p-5">
          <p className="text-sm font-semibold text-[#101011]">No calls yet</p>
          <p className="mt-1 text-[0.8125rem] leading-snug text-[#606266]">
            Calls booked through Calendly will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full space-y-3 overflow-y-auto bg-white p-5">
      {sortedCalls.map((call) => (
        <div
          key={call.id}
          className="rounded-2xl border border-[#F0F2F6] bg-white p-4"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <h4 className="text-sm font-semibold text-[#101011]">
              {call.title}
            </h4>
            <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-[#F3F0FF] px-2.5 text-[11px] font-semibold capitalize text-[#8771FF]">
              {call.status}
            </span>
          </div>

          <div className="mb-2 flex items-center text-[0.8125rem] text-[#606266]">
            <LuCalendar
              className="mr-2.5 h-4 w-4 shrink-0 text-[#9A9CA2]"
              aria-hidden="true"
            />
            {formatDateRange(call.startTime, call.endTime)}
          </div>
          <div className="mb-2 flex items-center text-[0.8125rem] text-[#606266]">
            <LuGlobe
              className="mr-2.5 h-4 w-4 shrink-0 text-[#9A9CA2]"
              aria-hidden="true"
            />
            {call.timezone || "UTC"}
          </div>
          <div className="mb-4 flex items-center text-[0.8125rem] text-[#606266]">
            <LuVideo
              className="mr-2.5 h-4 w-4 shrink-0 text-[#9A9CA2]"
              aria-hidden="true"
            />
            {call.joinUrl ? "Online meeting" : "Meeting details in Calendly"}
          </div>

          {call.joinUrl ? (
            <div className="flex justify-end">
              <a
                href={call.joinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-full bg-[#8771FF] px-4 text-xs font-semibold text-white transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-[#6d5ed6]"
              >
                Join Call
              </a>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
