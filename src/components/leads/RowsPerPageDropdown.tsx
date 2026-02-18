"use client";

import { ChevronDown } from "lucide-react";
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
        className="inline-flex h-9 min-w-[160px] items-center justify-between gap-2 rounded-lg border border-[#F0F2F6] bg-white px-3 text-xs font-medium text-[#606266]"
      >
        <span className="inline-flex items-center gap-2">
          Rows per page
          <span className="text-sm font-semibold text-[#101011]">{value}</span>
        </span>
        <ChevronDown
          size={14}
          className={`text-[#606266] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-full rounded-xl border border-[#F0F2F6] bg-white py-1 shadow-sm">
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
                className={`flex h-9 w-full items-center px-3 text-left text-sm ${
                  selected
                    ? "bg-[#8771FF] text-white"
                    : "text-[#101011] hover:bg-[#F8F7FF]"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
