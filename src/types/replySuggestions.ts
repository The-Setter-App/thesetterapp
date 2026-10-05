// The contract between the inbox and the suggested-replies endpoint.

// Ways a setter can ask for the drafts to be reworked.
export const REPLY_SUGGESTION_ADJUSTMENTS = [
  "shorter",
  "warmer",
  "more_direct",
  "book_call",
] as const;

export type ReplySuggestionAdjustment =
  (typeof REPLY_SUGGESTION_ADJUSTMENTS)[number];

export function isReplySuggestionAdjustment(
  value: unknown,
): value is ReplySuggestionAdjustment {
  return (
    typeof value === "string" &&
    REPLY_SUGGESTION_ADJUSTMENTS.some((adjustment) => adjustment === value)
  );
}

export interface ReplySuggestion {
  id: string;
  // A few words naming the approach this draft takes.
  angle: string;
  text: string;
}

export interface ReplySuggestionsResponse {
  suggestions: ReplySuggestion[];
}
