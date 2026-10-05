"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { SETTINGS_INPUT_CLASS } from "@/components/settings/settingsStyles";
import ModalShell from "@/components/ui/ModalShell";
import { searchIcons } from "@/lib/status/iconRegistry";
import type { TagIconPack } from "@/types/tags";
import type { IconSelection } from "./types";

interface StatusIconPickerModalProps {
  open: boolean;
  selectedIconPack: TagIconPack;
  selectedIconName: string;
  onClose: () => void;
  onSelect: (selection: IconSelection) => void;
}

const MAX_ICON_RESULTS = 280;

export default function StatusIconPickerModal({
  open,
  selectedIconPack,
  selectedIconName,
  onClose,
  onSelect,
}: StatusIconPickerModalProps) {
  const [query, setQuery] = useState("");

  const iconOptions = useMemo(
    () => searchIcons(query, { limit: MAX_ICON_RESULTS, packs: ["lu", "fa6"] }),
    [query],
  );

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <ModalShell
      title="Choose an icon"
      onClose={onClose}
      maxWidthClassName="md:max-w-2xl"
      layerClassName="z-[1200]"
    >
      {/* Stays put while the icons scroll underneath it. */}
      <div className="sticky top-0 z-10 bg-white pb-3">
        <div className="relative">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A9CA2]"
          />
          <input
            type="text"
            aria-label="Search icons"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search icons, e.g. calendar"
            className={`${SETTINGS_INPUT_CLASS} !pl-10`}
          />
        </div>
      </div>

      {iconOptions.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#606266]">
          No icons match your search.
        </p>
      ) : (
        <div className="mt-1 grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10">
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
                aria-pressed={selected}
                title={option.iconName}
                className={`inline-flex aspect-square w-full items-center justify-center rounded-xl outline-none transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.94] ${
                  selected
                    ? "bg-[#8771FF] text-white"
                    : "text-[#606266] [@media(hover:hover)]:hover:bg-[#F3F0FF] [@media(hover:hover)]:hover:text-[#8771FF]"
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
    </ModalShell>,
    document.body,
  );
}
