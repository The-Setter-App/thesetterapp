"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface LeadsInlineSelectOption<T extends string> {
  label: string;
  value: T;
}

interface LeadsInlineSelectProps<T extends string> {
  value: T;
  options: readonly LeadsInlineSelectOption<T>[];
  onChange: (value: T) => void;
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
          open
            ? "border-[#DDD6FF] bg-[#F3F0FF] text-[#8771FF]"
            : active
              ? "border-[#E6E1FF] bg-[#F8F7FF] text-[#8771FF]"
              : "border-[#F0F2F6] bg-white text-[#101011] hover:bg-[#F8F7FF]"
        } ${triggerClassName}`}
      >
        {selectedOption?.label}
        <ChevronDown
          size={16}
          className={`transition-transform ${
            open || active ? "text-[#8771FF]" : "text-[#9A9CA2]"
          } ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-full rounded-2xl border border-[#F0F2F6] bg-white py-1 shadow-sm">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex h-9 w-full items-center px-3 text-left text-sm whitespace-nowrap ${
                  active
                    ? "bg-[#8771FF] text-white"
                    : "text-[#101011] hover:bg-[#F8F7FF]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
