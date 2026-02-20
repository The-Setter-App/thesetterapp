"use client";

import type { LeadConversationSummary } from "@/types/setterAiLeadContext";

export default function LeadMentionMenu(props: {
  open: boolean;
  isLoading: boolean;
  items: LeadConversationSummary[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  highlightedIndex: number;
  onHighlight: (index: number) => void;
  onSelect: (item: LeadConversationSummary) => void;
  onClose: () => void;
}) {
  const {
    open,
    isLoading,
    items,
    searchQuery,
    onSearchQueryChange,
    highlightedIndex,
    onHighlight,
    onSelect,
  } = props;

  if (!open) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white shadow-sm"
      role="dialog"
      aria-label="Select a lead conversation"
    >
      <div className="border-b border-[#F0F2F6] p-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search leads..."
          className="h-10 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] placeholder:text-[#9A9CA2] outline-none focus:ring-0 focus-visible:outline-none"
          aria-label="Search lead conversations"
        />
      </div>
      <div
        className="max-h-72 overflow-y-auto p-1.5"
        role="listbox"
        aria-label="Lead conversations"
      >
        {isLoading && (
          <div className="px-3 py-2 text-xs text-[#606266]">
            Loading leads...
          </div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="px-3 py-2 text-xs text-[#606266]">
            No leads found.
          </div>
        )}
        {!isLoading &&
          items.map((item, index) => {
            const isActive = index === highlightedIndex;
            return (
              <button
                key={item.conversationId}
                type="button"
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => onHighlight(index)}
                onMouseDown={(e) => {
                  // Keep the input focused; selection happens without blur.
                  e.preventDefault();
                }}
                onClick={() => onSelect(item)}
                className={[
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors outline-none focus-visible:outline-none",
                  isActive ? "bg-[#F3F0FF]" : "hover:bg-[#F8F7FF]",
                ].join(" ")}
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#F0F2F6] bg-[#F8F7FF]">
                  {item.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.avatarUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#8771FF]">
                      {item.name.trim().slice(0, 1).toUpperCase() || "L"}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#101011]">
                    {item.name.replace(/^@/, "") || "Lead"}
                  </div>
                  <div className="truncate text-xs text-[#606266]">
                    {item.lastMessagePreview || "No messages yet"}
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
