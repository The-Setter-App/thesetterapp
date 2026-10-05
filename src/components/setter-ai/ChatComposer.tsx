"use client";

import { ArrowUp, AtSign, Square, X } from "lucide-react";
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

const MAX_TEXTAREA_HEIGHT_PX = 160;

export default function ChatComposer(props: {
  // Width classes shared with the message column above.
  columnClassName: string;
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
    columnClassName,
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

  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  // Opens the lead picker from its button, with no "@" typed in the message.
  const openLeadPicker = useCallback(() => {
    setMenuOpen(true);
    setMentionAtIndex(null);
    setMentionQuery("");
    setHighlightedIndex(0);
  }, []);

  // Grow the field with its content, up to a few lines. Re-measured whenever
  // the text changes, including when it is cleared after sending.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the text is the trigger; the measurement reads the DOM.
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  }, [input]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    <div className="shrink-0 px-4 pb-3 md:px-6 md:pb-4">
      <div
        data-composer-root
        className={`${columnClassName} relative flex flex-col rounded-[1.75rem] border border-[#F0F2F6] bg-white p-2 shadow-[0_8px_30px_rgba(16,16,17,0.07)] transition-colors duration-150 focus-within:border-[#8771FF]`}
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
          <div className="mb-1 flex items-center justify-between gap-2 rounded-[1.25rem] bg-[#F8F7FF] py-1.5 pl-3.5 pr-1.5">
            <p className="min-w-0 truncate text-[0.8125rem] text-[#606266]">
              <span className="font-semibold text-[#8771FF]">Using lead</span>{" "}
              <span className="font-medium text-[#101011]">
                {linkedLead.label}
              </span>
            </p>
            <button
              type="button"
              onClick={onClearLead}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#606266] outline-none transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.94] disabled:opacity-50 [@media(hover:hover)]:enabled:hover:bg-white [@media(hover:hover)]:enabled:hover:text-[#101011]"
              aria-label="Clear lead context"
              disabled={isLoading}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) =>
            handleChange(
              e.target.value,
              e.target.selectionStart ?? e.target.value.length,
            )
          }
          onKeyDown={handleKeyDown}
          aria-label="Message Setter AI"
          placeholder="Ask Setter AI"
          className="max-h-40 min-h-11 w-full resize-none bg-transparent px-3 py-2.5 text-[0.9375rem] leading-6 text-[#101011] outline-none placeholder:text-[#9A9CA2] focus:outline-none focus:ring-0 disabled:opacity-60"
          disabled={isLoading}
        />

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={menuOpen ? closeMenu : openLeadPicker}
            aria-expanded={menuOpen}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold outline-none transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.97] ${
              menuOpen || linkedLead?.conversationId
                ? "bg-[#F3F0FF] text-[#8771FF]"
                : "bg-[#F4F5F8] text-[#606266] [@media(hover:hover)]:hover:bg-[#ECEEF3] [@media(hover:hover)]:hover:text-[#101011]"
            }`}
          >
            <AtSign size={13} aria-hidden="true" />
            {linkedLead?.conversationId ? "Change lead" : "Add lead"}
          </button>
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              aria-label="Stop streaming"
              title="Stop"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#101011] text-white outline-none transition-transform duration-100 ease-out active:scale-[0.94]"
            >
              <Square size={12} fill="currentColor" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSend()}
              disabled={!input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8771FF] text-white outline-none transition-[transform,background-color] duration-100 ease-out active:scale-[0.94] disabled:bg-[#F4F5F8] disabled:text-[#9A9CA2] [@media(hover:hover)]:enabled:hover:bg-[#6d5ed6]"
            >
              <ArrowUp size={17} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-[#9A9CA2]">
        Setter AI drafts from your lead conversations. Review before you send.
      </p>
    </div>
  );
}
