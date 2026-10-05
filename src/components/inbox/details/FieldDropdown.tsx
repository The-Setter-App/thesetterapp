"use client";

import { useEffect, useRef, useState } from "react";
import { LuCheck, LuChevronDown } from "react-icons/lu";
import { AppImage } from "@/components/ui/AppImage";

export interface DropdownOption {
  label: string;
  value: string;
  iconSrc?: string;
}

interface FieldDropdownProps {
  value: string;
  options: DropdownOption[];
  placeholder?: string;
  onChange: (val: string) => void;
}

export default function FieldDropdown({
  value,
  options,
  placeholder,
  onChange,
}: FieldDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-sm text-[#101011] outline-none transition-colors duration-150 ${isOpen ? "border-[#8771FF]" : "border-[#F0F2F6]"}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="flex items-center min-w-0">
          {selected?.iconSrc ? (
            <AppImage
              src={selected.iconSrc}
              alt={selected.label}
              className="w-4 h-4 mr-2 shrink-0"
              loadingMode="lazy"
            />
          ) : null}
          <span
            className={`truncate ${selected ? "text-[#101011]" : "text-[#9A9CA2]"}`}
          >
            {selected?.label || placeholder || "Select an option"}
          </span>
        </span>
        <LuChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-[#9A9CA2] transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div className="absolute z-20 mt-1.5 max-h-64 w-full space-y-0.5 overflow-auto rounded-2xl border border-[#F0F2F6] bg-white p-1.5 shadow-[0_12px_32px_rgba(16,16,17,0.1)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl px-2.5 text-left outline-none transition-colors duration-100 ${value === option.value ? "bg-[#F3F0FF]" : "[@media(hover:hover)]:hover:bg-[#F8F7FF]"}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span className="flex items-center min-w-0">
                {option.iconSrc ? (
                  <AppImage
                    src={option.iconSrc}
                    alt={option.label}
                    className="w-4 h-4 mr-2 shrink-0"
                    loadingMode="lazy"
                  />
                ) : null}
                <span className="text-sm text-[#101011] truncate">
                  {option.label}
                </span>
              </span>
              {value === option.value ? (
                <LuCheck
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-[#8771FF]"
                />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
