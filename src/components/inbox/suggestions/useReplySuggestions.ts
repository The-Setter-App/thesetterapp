"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ReplySuggestion,
  ReplySuggestionAdjustment,
} from "@/types/replySuggestions";

export type ReplySuggestionsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; suggestions: ReplySuggestion[] }
  | { status: "error"; message: string };

export interface ReplySuggestionsController {
  state: ReplySuggestionsState;
  // Drafts replies afresh, optionally reworked in one direction.
  request: (adjustment?: ReplySuggestionAdjustment) => void;
  close: () => void;
}

const FALLBACK_ERROR = "Could not draft a reply this time. Try again.";

function isSuggestion(value: unknown): value is ReplySuggestion {
  if (!value || typeof value !== "object") return false;
  const { id, angle, text } = value as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof angle === "string" &&
    typeof text === "string" &&
    text.length > 0
  );
}

function readSuggestions(body: unknown): ReplySuggestion[] {
  if (!body || typeof body !== "object") return [];
  const list: unknown = (body as { suggestions?: unknown }).suggestions;
  return Array.isArray(list) ? list.filter(isSuggestion) : [];
}

function readErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return FALLBACK_ERROR;
  const message: unknown = (body as { error?: unknown }).error;
  return typeof message === "string" && message ? message : FALLBACK_ERROR;
}

// Fetches AI-drafted replies for one conversation. Switching conversation,
// closing, or asking again drops whatever request is still on its way.
export function useReplySuggestions(
  conversationId: string,
): ReplySuggestionsController {
  const [state, setState] = useState<ReplySuggestionsState>({ status: "idle" });
  const inFlightRef = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    inFlightRef.current?.abort();
    inFlightRef.current = null;
    setState({ status: "idle" });
  }, []);

  // Drafts belong to the conversation they were written for.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the id is the trigger; close is stable.
  useEffect(() => close, [conversationId, close]);

  const request = useCallback(
    (adjustment?: ReplySuggestionAdjustment) => {
      inFlightRef.current?.abort();
      const controller = new AbortController();
      inFlightRef.current = controller;
      setState({ status: "loading" });

      const run = async () => {
        try {
          const response = await fetch(
            `/api/inbox/conversations/${encodeURIComponent(conversationId)}/reply-suggestions`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(adjustment ? { adjustment } : {}),
              signal: controller.signal,
            },
          );
          const body: unknown = await response.json().catch(() => null);
          if (controller.signal.aborted) return;

          if (!response.ok) {
            setState({ status: "error", message: readErrorMessage(body) });
            return;
          }

          const suggestions = readSuggestions(body);
          setState(
            suggestions.length > 0
              ? { status: "ready", suggestions }
              : { status: "error", message: FALLBACK_ERROR },
          );
        } catch {
          if (controller.signal.aborted) return;
          setState({ status: "error", message: FALLBACK_ERROR });
        }
      };

      void run();
    },
    [conversationId],
  );

  return { state, request, close };
}
