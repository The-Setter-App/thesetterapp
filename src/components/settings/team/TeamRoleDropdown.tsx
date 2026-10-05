"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TeamMemberRole } from "@/types/auth";

interface RoleOption {
  value: TeamMemberRole;
  label: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  { value: "setter", label: "Setter" },
  { value: "closer", label: "Closer" },
];

interface TeamRoleDropdownProps {
  // Name of the hidden form field that carries the chosen role.
  name: string;
  defaultValue?: TeamMemberRole;
  // Submits the surrounding form as soon as a different role is picked, for
  // rows where the dropdown is the whole form.
  submitOnChange?: boolean;
}

export default function TeamRoleDropdown({
  name,
  defaultValue = "setter",
  submitOnChange = false,
}: TeamRoleDropdownProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<TeamMemberRole>(defaultValue);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // The role the form last held, so the same choice is never sent twice.
  const submittedValueRef = useRef<TeamMemberRole>(defaultValue);

  // Runs after the hidden field has taken the new value, so the form that
  // is submitted carries it.
  useEffect(() => {
    if (!submitOnChange || value === submittedValueRef.current) return;
    submittedValueRef.current = value;
    inputRef.current?.form?.requestSubmit();
  }, [submitOnChange, value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const container = containerRef.current;
      if (!container || !(event.target instanceof Node)) return;
      if (!container.contains(event.target)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selected =
    ROLE_OPTIONS.find((option) => option.value === value) ?? ROLE_OPTIONS[0];

  return (
    <div ref={containerRef} className="relative">
      <input ref={inputRef} type="hidden" name={name} value={value} />

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 text-[0.9375rem] text-[#101011] outline-none transition-colors duration-150 ${
          open ? "border-[#8771FF]" : "border-[#F0F2F6]"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Role: ${selected.label}`}
      >
        <span>{selected.label}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-[#9A9CA2] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 right-0 top-full z-20 mt-1.5 origin-top rounded-2xl border border-[#F0F2F6] bg-white p-1 shadow-[0_12px_32px_-12px_rgba(16,16,17,0.18)]"
        >
          {ROLE_OPTIONS.map((option) => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setValue(option.value);
                  setOpen(false);
                }}
                className={`flex h-10 w-full items-center justify-between rounded-xl px-3 text-left text-sm outline-none transition-colors duration-100 ${
                  isActive
                    ? "bg-[#F3F0FF] font-medium text-[#8771FF]"
                    : "text-[#101011] [@media(hover:hover)]:hover:bg-[#F8F7FF]"
                }`}
              >
                <span>{option.label}</span>
                {isActive ? <Check size={14} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
