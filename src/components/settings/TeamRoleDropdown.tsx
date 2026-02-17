"use client";

import { ChevronDown, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TeamMemberRole } from "@/types/auth";

const ROLE_OPTIONS: Array<{ value: TeamMemberRole; label: string }> = [
  { value: "setter", label: "Setter" },
  { value: "closer", label: "Closer" },
];

export default function TeamRoleDropdown({
  name,
  defaultValue = "setter",
}: {
  name: string;
  defaultValue?: TeamMemberRole;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<TeamMemberRole>(defaultValue);
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

  const selected = ROLE_OPTIONS.find((option) => option.value === value) || ROLE_OPTIONS[0];

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm font-medium text-[#101011] transition-colors hover:bg-[#F8F7FF]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected.label}</span>
        <ChevronDown size={16} className={`text-[#606266] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-[#F0F2F6] bg-white p-1 shadow-sm">
          <ul role="listbox" className="space-y-1">
            {ROLE_OPTIONS.map((option) => {
              const isActive = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => {
                      setValue(option.value);
                      setOpen(false);
                    }}
                    className={`flex h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm ${
                      isActive
                        ? "bg-[rgba(135,113,255,0.1)] text-[#8771FF]"
                        : "text-[#101011] hover:bg-[#F8F7FF]"
                    }`}
                    role="option"
                    aria-selected={isActive}
                  >
                    <span>{option.label}</span>
                    {isActive ? <Check size={14} className="text-[#8771FF]" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
