"use client";

import { LuRefreshCw, LuX } from "react-icons/lu";
import surface from "@/components/ui/brandSurface.module.css";
import type {
  ReplySuggestion,
  ReplySuggestionAdjustment,
} from "@/types/replySuggestions";
import type { ReplySuggestionsState } from "./useReplySuggestions";

interface ReplySuggestionsPanelProps {
  state: Exclude<ReplySuggestionsState, { status: "idle" }>;
  onUse: (suggestion: ReplySuggestion) => void;
  onRequest: (adjustment?: ReplySuggestionAdjustment) => void;
  onClose: () => void;
}

const ADJUSTMENT_OPTIONS: {
  value: ReplySuggestionAdjustment;
  label: string;
}[] = [
  { value: "shorter", label: "Shorter" },
  { value: "warmer", label: "Warmer" },
  { value: "more_direct", label: "More direct" },
  { value: "book_call", label: "Push for a call" },
];

// The chips are drawn 36px tall; the pseudo-element stretches the area that
// takes a tap to 44px without making the row taller.
const CHIP_CLASS =
  "relative inline-flex h-9 shrink-0 before:absolute before:inset-x-0 before:-inset-y-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#F4F5F8] px-3 text-[0.8125rem] font-semibold text-[#606266] outline-none transition-[transform,background-color,color,opacity] duration-100 ease-out active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 [@media(hover:hover)]:enabled:hover:bg-[#F3F0FF] [@media(hover:hover)]:enabled:hover:text-[#8771FF]";

const SKELETON_WIDTHS = ["w-11/12", "w-4/5", "w-3/4"];

function LoadingRows() {
  return (
    <div aria-busy="true" className="space-y-1 px-2 pb-2">
      <span className="sr-only">Drafting replies</span>
      {SKELETON_WIDTHS.map((width) => (
        <div key={width} className="rounded-2xl px-3 py-3">
          <div className="h-3 w-24 animate-pulse rounded-full bg-[#ECE9FF]" />
          <div
            className={`mt-2.5 h-3.5 animate-pulse rounded-full bg-[#F4F5F8] ${width}`}
          />
        </div>
      ))}
    </div>
  );
}

// The drafts for the open conversation, shown above the composer. Picking
// one puts it in the composer to edit; nothing is sent from here.
export default function ReplySuggestionsPanel({
  state,
  onUse,
  onRequest,
  onClose,
}: ReplySuggestionsPanelProps) {
  const isLoading = state.status === "loading";

  return (
    <section
      aria-label="Suggested replies"
      className={`${surface.confirm} flex max-h-[50dvh] flex-col overflow-hidden rounded-3xl border border-[#F0F2F6] bg-white shadow-[0_16px_40px_-20px_rgba(16,16,17,0.28)]`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 pl-5 pr-1.5 pt-1.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#101011]">
            Suggested replies
          </h2>
          <p className="truncate text-xs text-[#9A9CA2]">
            Pick one to edit before you send it.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close suggested replies"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#9A9CA2] outline-none transition-[transform,color,background-color] duration-100 ease-out active:scale-[0.94] [@media(hover:hover)]:hover:bg-[#F4F5F8] [@media(hover:hover)]:hover:text-[#101011]"
        >
          <LuX aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? <LoadingRows /> : null}

        {state.status === "error" ? (
          <p
            role="alert"
            className="px-5 pb-3 pt-1 text-sm font-medium text-red-600"
          >
            {state.message}
          </p>
        ) : null}

        {state.status === "ready" ? (
          <ul className="space-y-0.5 px-2 pb-2">
            {state.suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  onClick={() => onUse(suggestion)}
                  className="block w-full rounded-2xl px-3 py-2.5 text-left outline-none transition-colors duration-100 active:bg-[#F3F0FF] [@media(hover:hover)]:hover:bg-[#F8F7FF]"
                >
                  <span className="block text-xs font-semibold text-[#8771FF]">
                    {suggestion.angle}
                  </span>
                  <span className="mt-0.5 block whitespace-pre-wrap break-words text-[0.9375rem] leading-snug text-[#101011]">
                    {suggestion.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-t border-[#F0F2F6] px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => onRequest()}
          disabled={isLoading}
          className={CHIP_CLASS}
        >
          <LuRefreshCw
            aria-hidden="true"
            className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
          />
          Try again
        </button>
        {ADJUSTMENT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onRequest(option.value)}
            disabled={isLoading}
            className={CHIP_CLASS}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
