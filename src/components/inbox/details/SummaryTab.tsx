"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LuInfo } from "react-icons/lu";
import {
  getCachedConversationSummary,
  setCachedConversationSummary,
} from "@/lib/cache";
import type {
  ConversationSummary,
  ConversationSummaryResponse,
  ConversationSummarySection,
} from "@/types/inbox";

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
      <p className="mb-3 text-sm font-semibold text-[#101011]">
        {section.title}
      </p>
      <ul className="space-y-2.5 text-[#606266]">
        {section.points.map((point, index) => (
          <li
            key={`${section.title}-${index}-${point}`}
            className="flex items-start"
          >
            <span
              aria-hidden="true"
              className="mr-2.5 mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9BFFF]"
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function SummaryTab({ conversationId }: SummaryTabProps) {
  const [clientSnapshot, setClientSnapshot] =
    useState<ConversationSummarySection>(EMPTY_SECTION);
  const [actionPlan, setActionPlan] =
    useState<ConversationSummarySection>(EMPTY_SECTION);
  const [hydrating, setHydrating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasSummary = useMemo(
    () => clientSnapshot.points.length > 0 || actionPlan.points.length > 0,
    [actionPlan.points.length, clientSnapshot.points.length],
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
      const response = await fetch(
        `/api/inbox/conversations/${encodeURIComponent(conversationId)}/summary`,
        {
          method: "POST",
        },
      );

      const payload = (await response.json()) as ConversationSummaryResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to generate summary");
      }

      applySummary(payload.summary);
      setCachedConversationSummary(conversationId, payload.summary).catch(
        (cacheError) =>
          console.error(
            "[SummaryTab] Failed to cache generated summary:",
            cacheError,
          ),
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Failed to generate summary";
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
        const cachedSummary =
          await getCachedConversationSummary(conversationId);
        if (!active) return;
        if (cachedSummary) {
          applySummary(cachedSummary.summary);
          setHydrating(false);
          return;
        }

        setHydrating(true);
        const response = await fetch(
          `/api/inbox/conversations/${encodeURIComponent(conversationId)}/summary`,
        );
        const payload =
          (await response.json()) as ConversationSummaryResponse & {
            error?: string;
          };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load summary");
        }
        if (!active) return;
        applySummary(payload.summary);
        setCachedConversationSummary(conversationId, payload.summary).catch(
          (cacheError) =>
            console.error(
              "[SummaryTab] Failed to cache fetched summary:",
              cacheError,
            ),
        );
      } catch (requestError) {
        if (!active) return;
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Failed to load summary";
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
    <div className="flex-1 overflow-y-auto bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <LuInfo
            className="mt-0.5 h-4 w-4 shrink-0 text-[#9A9CA2]"
            aria-hidden="true"
          />
          <p className="text-xs leading-snug text-[#606266]">
            Summary is generated using info from this conversation.
          </p>
        </div>
        <button
          type="button"
          onClick={runSummary}
          disabled={loading || hydrating || !conversationId}
          className={[
            "h-9 min-w-[6.5rem] shrink-0 rounded-full px-4 text-xs font-semibold outline-none",
            "inline-flex items-center justify-center bg-[#8771FF] text-white",
            "transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.97]",
            loading
              ? "cursor-wait"
              : "[@media(hover:hover)]:enabled:hover:bg-[#6d5ed6]",
            !conversationId || hydrating ? "cursor-not-allowed opacity-50" : "",
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

      <div className="rounded-2xl border border-[#F0F2F6] bg-white p-5 text-[0.8125rem] leading-relaxed">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-[#E6E0FF] bg-[#F8F7FF] p-4">
            <p className="text-[11px] font-semibold text-[#6d5ed6] mb-3">
              Generating summary...
            </p>
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
            <p className="text-[11px] font-semibold text-[#606266] mb-3">
              Loading saved summary...
            </p>
            <div className="space-y-2">
              <div className="h-2.5 rounded-full bg-[#ECEEF3] animate-pulse" />
              <div className="h-2.5 rounded-full bg-[#ECEEF3] animate-pulse" />
              <div className="h-2.5 w-4/5 rounded-full bg-[#ECEEF3] animate-pulse" />
            </div>
          </div>
        ) : null}

        {!hasSummary && !loading && !hydrating && !error ? (
          <p className="text-[0.8125rem] text-[#606266]">
            No summary yet. Click Summarize to generate one from recent
            messages.
          </p>
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
