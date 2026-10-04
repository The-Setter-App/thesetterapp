"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { LuChevronDown } from "react-icons/lu";

interface SinglePillDropdownProps {
  icon: ReactNode;
  label: string;
}

/** A dropdown-styled trigger with exactly one selectable option. There's no
 * backend to filter by yet, so this stays honest about only offering the
 * one real choice instead of pretending to be a working multi-option filter. */
export default function SinglePillDropdown({
  icon,
  label,
}: SinglePillDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-[#F0F2F6] bg-white px-4 text-sm font-medium text-[#101011] shadow-sm outline-none transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-[#F8F7FF]"
      >
        {icon}
        <span>{label}</span>
        <LuChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-[#9A9CA2] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-44 origin-top-right rounded-2xl border border-[#F0F2F6] bg-white p-1.5 shadow-[0_12px_32px_rgba(16,16,17,0.08)]">
          <div className="flex h-10 items-center rounded-xl bg-[#F3F0FF] px-3 text-sm font-medium text-[#8771FF]">
            {label}
          </div>
        </div>
      )}
    </div>
  );
}
