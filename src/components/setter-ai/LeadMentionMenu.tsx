"use client";

import { Search } from "lucide-react";
import LeadAvatar from "@/components/inbox/LeadAvatar";
import type { LeadConversationSummary } from "@/types/setterAiLeadContext";

interface LeadMentionMenuProps {
  open: boolean;
  isLoading: boolean;
  items: LeadConversationSummary[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  highlightedIndex: number;
  onHighlight: (index: number) => void;
  onSelect: (item: LeadConversationSummary) => void;
  onClose: () => void;
}

export default function LeadMentionMenu({
  open,
  isLoading,
  items,
  searchQuery,
  onSearchQueryChange,
  highlightedIndex,
  onHighlight,
  onSelect,
}: LeadMentionMenuProps) {
  if (!open) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-3xl border border-[#F0F2F6] bg-white shadow-[0_16px_48px_rgba(16,16,17,0.14)]"
      role="dialog"
      aria-label="Select a lead conversation"
    >
      <div className="p-2 pb-1">
        <label className="relative block">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A9CA2]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search leads"
            className="h-10 w-full rounded-full border border-transparent bg-[#F4F5F8] pl-10 pr-4 text-sm text-[#101011] outline-none transition-colors duration-150 placeholder:text-[#9A9CA2] focus:border-[#8771FF] focus:bg-white focus:ring-0"
            aria-label="Search lead conversations"
          />
        </label>
      </div>
      <div
        className="max-h-72 space-y-0.5 overflow-y-auto p-2 pt-1"
        role="listbox"
        aria-label="Lead conversations"
      >
        {isLoading && (
          <p className="px-3 py-3 text-[0.8125rem] text-[#606266]">
            Loading leads...
          </p>
        )}
        {!isLoading && items.length === 0 && (
          <p className="px-3 py-3 text-[0.8125rem] text-[#606266]">
            No leads found.
          </p>
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
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left outline-none transition-colors duration-100 ${
                  isActive ? "bg-[#F3F0FF]" : ""
                }`}
              >
                {item.avatarUrl ? (
                  <LeadAvatar
                    conversationId={item.conversationId}
                    src={item.avatarUrl}
                    alt={item.name}
                    className="h-9 w-9 shrink-0 rounded-full bg-[#F4F5F8] object-cover"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F0FF] text-xs font-semibold text-[#8771FF]">
                    {item.name
                      .replace(/^@/, "")
                      .trim()
                      .slice(0, 1)
                      .toUpperCase() || "L"}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#101011]">
                    {item.name.replace(/^@/, "") || "Lead"}
                  </span>
                  <span className="block truncate text-xs text-[#606266]">
                    {item.lastMessagePreview || "No messages yet"}
                  </span>
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
