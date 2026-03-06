"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { Button } from "@/components/ui/Button";
import { searchIcons } from "@/lib/status/iconRegistry";
import type { TagIconPack } from "@/types/tags";

interface IconSelection {
  iconPack: TagIconPack;
  iconName: string;
}

interface StatusIconPickerModalProps {
  open: boolean;
  selectedIconPack: TagIconPack;
  selectedIconName: string;
  onClose: () => void;
  onSelect: (selection: IconSelection) => void;
}

export default function StatusIconPickerModal({
  open,
  selectedIconPack,
  selectedIconName,
  onClose,
  onSelect,
}: StatusIconPickerModalProps) {
  const [query, setQuery] = useState("");

  const iconOptions = useMemo(
    () => searchIcons(query, { limit: 280, packs: ["lu", "fa6"] }),
    [query],
  );

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#F0F2F6] px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-[#101011]">
              Select status icon
            </p>
            <p className="mt-0.5 text-xs text-[#606266]">Search React Icons.</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#F0F2F6] text-[#606266] transition-colors hover:bg-[#F8F7FF]"
            onClick={onClose}
            aria-label="Close icon picker"
          >
            <X size={16} />
          </button>
        </div>

        <div className="border-b border-[#F0F2F6] px-5 py-4">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#9A9CA2]">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search icons (e.g. user, calendar, arrow)"
              className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white pl-9 pr-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9A9CA2] hover:bg-[#F8F7FF]"
            />
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto px-5 py-4">
          {iconOptions.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#606266]">
              No icons match your search.
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
              {iconOptions.map((option) => {
                const selected =
                  selectedIconPack === option.iconPack &&
                  selectedIconName === option.iconName;
                return (
                  <button
                    key={`${option.iconPack}:${option.iconName}`}
                    type="button"
                    onClick={() => onSelect(option)}
                    aria-label={`Select ${option.iconName}`}
                    title={option.iconName}
                    className={`inline-flex aspect-square w-full items-center justify-center rounded-xl border transition-colors ${
                      selected
                        ? "border-[#8771FF] bg-[#F3F0FF] text-[#8771FF]"
                        : "border-[#F0F2F6] bg-white text-[#606266] hover:bg-[#F8F7FF]"
                    }`}
                  >
                    <StatusIcon
                      iconPack={option.iconPack}
                      iconName={option.iconName}
                      className="h-5 w-5"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-[#F0F2F6] px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
