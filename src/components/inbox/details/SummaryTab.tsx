"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConversationSummary, ConversationSummaryResponse, ConversationSummarySection } from "@/types/inbox";
import { getCachedConversationSummary, setCachedConversationSummary } from "@/lib/clientCache";

interface SummaryTabProps {
  conversationId: string;
}

const EMPTY_SECTION: ConversationSummarySection = {
  title: "",
  points: [],
};

function SummarySection({ section }: { section: ConversationSummarySection }) {
  return (
    <>
      <p className="font-bold text-gray-900 text-sm mb-3">{section.title}</p>
      <ul className="space-y-3 pl-1 text-gray-600">
        {section.points.map((point, index) => (
          <li key={`${section.title}-${index}-${point}`} className="flex items-start">
            <span className="mr-2 text-gray-300 text-[8px] mt-1.5">●</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function SummaryTab({ conversationId }: SummaryTabProps) {
  const [clientSnapshot, setClientSnapshot] = useState<ConversationSummarySection>(EMPTY_SECTION);
  const [actionPlan, setActionPlan] = useState<ConversationSummarySection>(EMPTY_SECTION);
  const [hydrating, setHydrating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasSummary = useMemo(
    () => clientSnapshot.points.length > 0 || actionPlan.points.length > 0,
    [actionPlan.points.length, clientSnapshot.points.length]
  );

  const applySummary = useCallback((summary: ConversationSummary | null) => {
    setClientSnapshot(summary?.clientSnapshot ?? EMPTY_SECTION);
    setActionPlan(summary?.actionPlan ?? EMPTY_SECTION);
  }, []);

  const runSummary = useCallback(async () => {
    if (!conversationId || loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/inbox/conversations/${encodeURIComponent(conversationId)}/summary`, {
        method: "POST",
      });

      const payload = (await response.json()) as ConversationSummaryResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to generate summary");
      }

      applySummary(payload.summary);
      setCachedConversationSummary(conversationId, payload.summary).catch((cacheError) =>
        console.error("[SummaryTab] Failed to cache generated summary:", cacheError)
      );
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Failed to generate summary";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [applySummary, conversationId, loading]);

  useEffect(() => {
    applySummary(null);
    setError("");
    setHydrating(false);
    if (!conversationId) return;

    let active = true;

    (async () => {
      try {
        const cachedSummary = await getCachedConversationSummary(conversationId);
        if (!active) return;
        if (cachedSummary) {
          applySummary(cachedSummary.summary);
          setHydrating(false);
          return;
        }

        setHydrating(true);
        const response = await fetch(`/api/inbox/conversations/${encodeURIComponent(conversationId)}/summary`);
        const payload = (await response.json()) as ConversationSummaryResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load summary");
        }
        if (!active) return;
        applySummary(payload.summary);
        setCachedConversationSummary(conversationId, payload.summary).catch((cacheError) =>
          console.error("[SummaryTab] Failed to cache fetched summary:", cacheError)
        );
      } catch (requestError) {
        if (!active) return;
        const message = requestError instanceof Error ? requestError.message : "Failed to load summary";
        setError(message);
      } finally {
        if (active) setHydrating(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [applySummary, conversationId]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <img src="/icons/Info.svg" alt="Info" className="w-6 h-5 mr-2" />
          <p className="text-xs text-gray-500 font-medium">Summary is generated using info from this conversation.</p>
        </div>
        <button
          type="button"
          onClick={runSummary}
          disabled={loading || hydrating || !conversationId}
          className={[
            "ml-2 h-6 min-w-[110px] rounded-full px-3 text-[10px] font-bold transition-colors",
            "inline-flex items-center justify-center",
            loading
              ? "bg-[#8771FF] text-white cursor-wait"
              : "bg-[#A9A9AF] text-white hover:bg-[#8771FF]",
            !conversationId || hydrating ? "opacity-60 cursor-not-allowed hover:bg-[#A9A9AF]" : "",
          ].join(" ")}
        >
          {loading ? (
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"
            />
          ) : hasSummary ? (
            "Regenerate"
          ) : (
            "Summarize"
          )}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-xs leading-relaxed">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-[#E6E0FF] bg-[#F8F7FF] p-4">
            <p className="text-[11px] font-semibold text-[#6d5ed6] mb-3">Generating summary...</p>
            <div className="space-y-2 mb-4">
              <div className="h-2.5 rounded-full bg-[#E4DDFF] animate-pulse" />
              <div className="h-2.5 rounded-full bg-[#E4DDFF] animate-pulse" />
              <div className="h-2.5 w-4/5 rounded-full bg-[#E4DDFF] animate-pulse" />
            </div>
            <div className="h-px bg-[#E8E2FF] mb-4" />
            <div className="space-y-2">
              <div className="h-2.5 rounded-full bg-[#E4DDFF] animate-pulse" />
              <div className="h-2.5 w-5/6 rounded-full bg-[#E4DDFF] animate-pulse" />
              <div className="h-2.5 w-3/4 rounded-full bg-[#E4DDFF] animate-pulse" />
            </div>
          </div>
        ) : null}

        {hydrating && !hasSummary && !loading ? (
          <div className="rounded-2xl border border-[#F0F2F6] bg-[#FAFBFD] p-4">
            <p className="text-[11px] font-semibold text-[#606266] mb-3">Loading saved summary...</p>
            <div className="space-y-2">
              <div className="h-2.5 rounded-full bg-[#ECEEF3] animate-pulse" />
              <div className="h-2.5 rounded-full bg-[#ECEEF3] animate-pulse" />
              <div className="h-2.5 w-4/5 rounded-full bg-[#ECEEF3] animate-pulse" />
            </div>
          </div>
        ) : null}

        {!hasSummary && !loading && !hydrating && !error ? (
          <p className="text-xs text-gray-500">No summary yet. Click Summarize to generate one from recent messages.</p>
        ) : null}

        {hasSummary && !loading ? (
          <>
            <SummarySection section={clientSnapshot} />
            <div className="my-5" />
            <SummarySection section={actionPlan} />
          </>
        ) : null}
      </div>
    </div>
  );
}
