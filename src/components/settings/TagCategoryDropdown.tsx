"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { TAG_CATEGORY_OPTIONS } from "@/lib/tags/config";
import type { TagCategory } from "@/types/tags";

interface TagCategoryDropdownProps {
  id: string;
  name?: string;
  value: TagCategory;
  onChange: (category: TagCategory) => void;
}

export default function TagCategoryDropdown({
  id,
  name,
  value,
  onChange,
}: TagCategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const selectedIndex = TAG_CATEGORY_OPTIONS.findIndex(
      (option) => option.value === value,
    );
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [value]);

  const selectedIndex = TAG_CATEGORY_OPTIONS.findIndex(
    (option) => option.value === value,
  );
  const resolvedSelectedIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const selected = TAG_CATEGORY_OPTIONS[resolvedSelectedIndex];

  function selectByIndex(index: number) {
    const option = TAG_CATEGORY_OPTIONS[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((current) =>
        Math.min(current + 1, TAG_CATEGORY_OPTIONS.length - 1),
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      selectByIndex(highlightedIndex);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <button
        id={id}
        type="button"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm font-medium text-[#101011] transition-colors hover:bg-[#F8F7FF]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
      >
        <span>{selected.label}</span>
        <ChevronDown
          size={16}
          className={`text-[#606266] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={`${id}-menu`}
          className="absolute z-20 mt-2 w-full rounded-xl border border-[#F0F2F6] bg-white p-1 shadow-sm"
        >
          <div role="listbox" className="space-y-1" aria-labelledby={id}>
            {TAG_CATEGORY_OPTIONS.map((option, optionIndex) => {
              const isActive = option.value === value;
              const isHighlighted = optionIndex === highlightedIndex;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    selectByIndex(optionIndex);
                  }}
                  onMouseEnter={() => setHighlightedIndex(optionIndex)}
                  className={`flex h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm ${
                    isActive || isHighlighted
                      ? "bg-[rgba(135,113,255,0.1)] text-[#8771FF]"
                      : "text-[#101011] hover:bg-[#F8F7FF]"
                  }`}
                  role="option"
                  aria-selected={isActive}
                >
                  <span>{option.label}</span>
                  {isActive ? (
                    <Check size={14} className="text-[#8771FF]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
