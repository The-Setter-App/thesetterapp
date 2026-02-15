"use client";

import { useEffect, useRef, useState } from "react";

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

export default function FieldDropdown({ value, options, placeholder, onChange }: FieldDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
        className="h-11 w-full border border-gray-200 rounded-lg px-3 bg-white text-sm text-gray-900 flex items-center justify-between"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="flex items-center min-w-0">
          {selected?.iconSrc ? <img src={selected.iconSrc} alt={selected.label} className="w-4 h-4 mr-2 shrink-0" /> : null}
          <span className={`truncate ${selected ? "text-gray-900" : "text-gray-400"}`}>
            {selected?.label || placeholder || "Select an option"}
          </span>
        </span>
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen ? (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-md max-h-64 overflow-auto border border-gray-200">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="w-full text-left flex items-center justify-between p-2.5 hover:bg-gray-50"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span className="flex items-center min-w-0">
                {option.iconSrc ? <img src={option.iconSrc} alt={option.label} className="w-4 h-4 mr-2 shrink-0" /> : null}
                <span className="text-sm text-gray-900 truncate">{option.label}</span>
              </span>
              {value === option.value ? (
                <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-8.25 8.25a1 1 0 01-1.42 0l-3.75-3.75a1 1 0 111.414-1.42l3.04 3.043 7.54-7.543a1 1 0 011.426 0z" clipRule="evenodd" />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
