"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface RowsPerPageDropdownProps {
  value: number;
  options: readonly number[];
  onChange: (nextValue: number) => void;
}

export default function RowsPerPageDropdown({
  value,
  options,
  onChange,
}: RowsPerPageDropdownProps) {
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#F4F5F8] px-3 text-xs font-medium text-[#606266] outline-none transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-[#ECEEF3]"
      >
        Rows
        <span className="font-semibold text-[#101011] tabular-nums">
          {value}
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`text-[#9A9CA2] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Opens upward: the control sits in the bar at the bottom of the page. */}
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 min-w-[7rem] space-y-0.5 rounded-2xl border border-[#F0F2F6] bg-white p-1.5 shadow-[0_12px_32px_rgba(16,16,17,0.1)]">
          {options.map((option) => {
            const selected = option === value;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={`flex h-9 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm tabular-nums outline-none transition-colors duration-100 ${
                  selected
                    ? "bg-[#F3F0FF] font-medium text-[#101011]"
                    : "text-[#101011] [@media(hover:hover)]:hover:bg-[#F8F7FF]"
                }`}
              >
                {option}
                {selected && (
                  <Check
                    size={14}
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
