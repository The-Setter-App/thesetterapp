"use client";

import { LuLightbulb } from "react-icons/lu";
import type { ReplySuggestion } from "@/types/replySuggestions";
import ReplySuggestionsPanel from "./ReplySuggestionsPanel";
import { useReplySuggestions } from "./useReplySuggestions";

interface ReplySuggestionsProps {
  conversationId: string;
  // Receives the chosen draft so the composer can show it for editing.
  onUseSuggestion: (text: string) => void;
}

// Sits above the composer: a small button that asks for drafts, replaced by
// the drafts themselves once asked.
export default function ReplySuggestions({
  conversationId,
  onUseSuggestion,
}: ReplySuggestionsProps) {
  const { state, request, close } = useReplySuggestions(conversationId);

  const handleUse = (suggestion: ReplySuggestion) => {
    onUseSuggestion(suggestion.text);
    close();
  };

  return (
    // The button is drawn 36px tall; its pseudo-element stretches the area
    // that takes a tap to 44px.
    <div className="shrink-0 bg-white px-4 pt-1 md:px-6">
      {state.status === "idle" ? (
        <button
          type="button"
          onClick={() => request()}
          className="relative inline-flex h-9 items-center gap-1.5 rounded-full bg-[#F3F0FF] before:absolute before:inset-x-0 before:-inset-y-1 px-3.5 text-[0.8125rem] font-semibold text-[#8771FF] outline-none transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-[#EBE5FF]"
        >
          <LuLightbulb aria-hidden="true" className="h-4 w-4" />
          Suggest a reply
        </button>
      ) : (
        <ReplySuggestionsPanel
          state={state}
          onUse={handleUse}
          onRequest={request}
          onClose={close}
        />
      )}
    </div>
  );
}
