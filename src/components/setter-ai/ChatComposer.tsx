"use client";

import { ArrowUp, Bot, Square, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LeadMentionMenu from "@/components/setter-ai/LeadMentionMenu";
import type { LeadConversationSummary } from "@/types/setterAiLeadContext";

function getMentionQuery(
  value: string,
  caret: number,
): {
  atIndex: number;
  query: string;
} | null {
  const beforeCaret = value.slice(0, caret);
  const atIndex = beforeCaret.lastIndexOf("@");
  if (atIndex < 0) return null;

  const prevChar = atIndex === 0 ? " " : beforeCaret[atIndex - 1] || "";
  if (atIndex !== 0 && !/\s/.test(prevChar)) return null;

  const query = beforeCaret.slice(atIndex + 1);
  if (/\s/.test(query)) return null;

  return { atIndex, query };
}

export default function ChatComposer(props: {
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  isStreaming: boolean;
  onSend: (override?: string) => void;
  onStopStreaming: () => void;
  linkedLead: { conversationId: string; label: string } | null | undefined;
  onLinkLead: (lead: LeadConversationSummary) => void;
  onClearLead: () => void;
}) {
  const {
    input,
    setInput,
    isLoading,
    isStreaming,
    onSend,
    onStopStreaming,
    linkedLead,
    onLinkLead,
    onClearLead,
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  const lastCaretRef = useRef(0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [mentionAtIndex, setMentionAtIndex] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [items, setItems] = useState<LeadConversationSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const effectiveHighlightedIndex = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.min(Math.max(highlightedIndex, 0), items.length - 1);
  }, [highlightedIndex, items.length]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMentionAtIndex(null);
    setMentionQuery("");
    setItems([]);
    setIsSearching(false);
    setHighlightedIndex(0);
  }, []);

  const openMenuFor = useCallback((atIndex: number, query: string) => {
    setMenuOpen(true);
    setMentionAtIndex(atIndex);
    setMentionQuery(query);
    setHighlightedIndex(0);
  }, []);

  const handleMentionMenuSearchChange = useCallback((value: string) => {
    setMentionQuery(value);
    setHighlightedIndex(0);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const root = inputRef.current?.closest("[data-composer-root]");
      if (!root) return;
      if (!root.contains(target)) closeMenu();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [closeMenu, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        if (mentionQuery.trim()) params.set("q", mentionQuery.trim());
        params.set("limit", "20");
        const res = await fetch(
          `/api/setter-ai/lead-conversations?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!res.ok) {
          setItems([]);
          return;
        }
        const data = (await res.json()) as {
          conversations?: LeadConversationSummary[];
        };
        setItems(Array.isArray(data.conversations) ? data.conversations : []);
      } catch {
        setItems([]);
      } finally {
        setIsSearching(false);
      }
    }, 120);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [menuOpen, mentionQuery]);

  const handleChange = (value: string, caret: number) => {
    setInput(value);
    lastCaretRef.current = caret;

    const mention = getMentionQuery(value, caret);
    if (!mention) {
      closeMenu();
      return;
    }
    openMenuFor(mention.atIndex, mention.query);
  };

  const selectLead = useCallback(
    (lead: LeadConversationSummary) => {
      onLinkLead(lead);

      const atIndex = mentionAtIndex;
      const caret = lastCaretRef.current;
      if (typeof atIndex === "number" && atIndex >= 0 && caret >= atIndex) {
        const next = (input.slice(0, atIndex) + input.slice(caret)).replace(
          /\s{2,}/g,
          " ",
        );
        setInput(next.trimStart());
      }

      closeMenu();

      // Keep typing flow.
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    },
    [closeMenu, input, mentionAtIndex, onLinkLead, setInput],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (menuOpen) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          items.length ? Math.min(prev + 1, items.length - 1) : 0,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = items[effectiveHighlightedIndex];
        if (item) selectLead(item);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) onSend();
    }
  };

  return (
    <div className="shrink-0 px-4 pb-4 md:px-6 md:pb-6">
      <div
        data-composer-root
        className="relative mx-auto flex w-full flex-col gap-2 rounded-2xl border border-[#F0F2F6] bg-white p-2.5 shadow-sm md:w-[50%]"
      >
        <LeadMentionMenu
          open={menuOpen}
          isLoading={isSearching}
          items={items}
          searchQuery={mentionQuery}
          onSearchQueryChange={handleMentionMenuSearchChange}
          highlightedIndex={effectiveHighlightedIndex}
          onHighlight={setHighlightedIndex}
          onSelect={selectLead}
          onClose={closeMenu}
        />

        {linkedLead?.conversationId ? (
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] px-3 py-2">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-[#8771FF]">
                Using lead context
              </div>
              <div className="truncate text-xs text-[#101011]">
                {linkedLead.label}
              </div>
            </div>
            <button
              type="button"
              onClick={onClearLead}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#F0F2F6] bg-white text-[#606266] transition-colors hover:bg-[#F3F0FF] outline-none focus-visible:outline-none"
              aria-label="Clear lead context"
              disabled={isLoading}
            >
              <X size={14} />
            </button>
          </div>
        ) : null}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) =>
            handleChange(
              e.target.value,
              e.target.selectionStart ?? e.target.value.length,
            )
          }
          onKeyDown={handleKeyDown}
          placeholder='Type a message... (use "@" to pick a lead)'
          className="h-10 w-full rounded-xl bg-white px-3 text-sm text-[#101011] placeholder:text-[#9A9CA2] outline-none focus:ring-0 focus-visible:outline-none"
          disabled={isLoading}
        />

        <div className="flex items-center justify-between">
          <button
            type="button"
            className="inline-flex h-9 w-auto max-w-[180px] items-center gap-2 rounded-full border border-[#F0F2F6] bg-[#F8F7FF] px-3 text-xs font-medium text-[#606266] transition-colors hover:border-[#D9D2FF] hover:bg-[#F3F0FF] outline-none focus-visible:outline-none"
          >
            <Bot size={13} className="text-[#8771FF]" />
            <span className="max-w-[120px] truncate whitespace-nowrap">
              SetterAI
            </span>
          </button>
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              aria-label="Stop streaming"
              className="inline-flex h-10 min-w-[44px] items-center justify-center gap-1 rounded-full border border-[#F0F2F6] bg-[#F3F0FF] px-3 text-xs font-medium text-[#8771FF] transition-colors hover:bg-[#EBE5FF] outline-none focus-visible:outline-none"
            >
              <Square size={12} fill="currentColor" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSend()}
              disabled={!input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 min-w-[40px] items-center justify-center rounded-full bg-[#8771FF] text-white transition-all hover:bg-[#6d5ed6] hover:scale-[1.02] active:scale-95 outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowUp size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="inline-block rounded-full bg-[#F8F7FF]/95 px-2 py-0.5 text-[11px] text-[#606266]">
          Setter AI Copilot Real-time guidance for lead replies, follow-ups, and
          conversion-focused conversations.
        </p>
      </div>
    </div>
  );
}
