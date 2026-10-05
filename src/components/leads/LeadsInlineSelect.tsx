"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface LeadsInlineSelectOption<T extends string> {
  label: string;
  value: T;
}

interface LeadsInlineSelectProps<T extends string> {
  value: T;
  options: readonly LeadsInlineSelectOption<T>[];
  onChange: (value: T) => void;
  // True when the filter is set to something other than its default.
  active?: boolean;
  triggerClassName?: string;
}

export default function LeadsInlineSelect<T extends string>({
  value,
  options,
  onChange,
  active = false,
  triggerClassName = "",
}: LeadsInlineSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];
  const highlighted = open || active;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-medium outline-none transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.97] ${
          highlighted
            ? "bg-[#F3F0FF] text-[#8771FF]"
            : "bg-[#F4F5F8] text-[#101011] [@media(hover:hover)]:hover:bg-[#ECEEF3]"
        } ${triggerClassName}`}
      >
        {selectedOption?.label}
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={`transition-transform duration-150 ${
            highlighted ? "text-[#8771FF]" : "text-[#9A9CA2]"
          } ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-full space-y-0.5 rounded-2xl border border-[#F0F2F6] bg-white p-1.5 shadow-[0_12px_32px_rgba(16,16,17,0.1)]">
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex h-10 w-full items-center justify-between gap-4 whitespace-nowrap rounded-xl px-3 text-left text-sm outline-none transition-colors duration-100 ${
                  selected
                    ? "bg-[#F3F0FF] font-medium text-[#101011]"
                    : "text-[#101011] [@media(hover:hover)]:hover:bg-[#F8F7FF]"
                }`}
              >
                {option.label}
                {selected && (
                  <Check
                    size={15}
                    aria-hidden="true"
                    className="shrink-0 text-[#8771FF]"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
