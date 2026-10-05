"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { toStatusColorRgba } from "@/lib/status/config";
import type { StatusType } from "@/types/status";
import type { TagRow } from "@/types/tags";

interface StatusMultiSelectProps {
  selectedStatuses: StatusType[];
  statusOptions: TagRow[];
  onToggleStatus: (status: StatusType) => void;
  getStatusCount: (status: StatusType) => number;
}

function getTriggerLabel(selectedCount: number): string {
  if (selectedCount === 0) return "Any status";
  return selectedCount === 1 ? "1 status" : `${selectedCount} statuses`;
}

export default function StatusMultiSelect({
  selectedStatuses,
  statusOptions,
  onToggleStatus,
  getStatusCount,
}: StatusMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return statusOptions;
    return statusOptions.filter((status) =>
      `${status.name} ${status.description}`.toLowerCase().includes(query),
    );
  }, [search, statusOptions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const highlighted = open || selectedStatuses.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-medium outline-none transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.97] ${
          highlighted
            ? "bg-[#F3F0FF] text-[#8771FF]"
            : "bg-[#F4F5F8] text-[#101011] [@media(hover:hover)]:hover:bg-[#ECEEF3]"
        }`}
      >
        {getTriggerLabel(selectedStatuses.length)}
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={`transition-transform duration-150 ${
            highlighted ? "text-[#8771FF]" : "text-[#9A9CA2]"
          } ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-[#F0F2F6] bg-white p-1.5 shadow-[0_12px_32px_rgba(16,16,17,0.1)]">
          <label className="relative mb-1.5 block">
            <span className="sr-only">Search statuses</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A9CA2]"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search statuses"
              className="h-10 w-full rounded-full border border-transparent bg-[#F4F5F8] pl-9 pr-3 text-sm text-[#101011] outline-none transition-colors duration-150 placeholder:text-[#9A9CA2] focus:border-[#8771FF] focus:bg-white focus:ring-0"
            />
          </label>

          <div className="max-h-72 space-y-0.5 overflow-y-auto">
            {filteredOptions.map((status) => {
              const selected = selectedStatuses.includes(status.name);
              return (
                <button
                  type="button"
                  key={status.id}
                  aria-pressed={selected}
                  onClick={() => onToggleStatus(status.name)}
                  className={`flex h-10 w-full items-center justify-between gap-3 rounded-xl px-2.5 text-left outline-none transition-colors duration-100 ${
                    selected
                      ? "bg-[#F3F0FF]"
                      : "[@media(hover:hover)]:hover:bg-[#F8F7FF]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: toStatusColorRgba(
                          status.colorHex,
                          0.16,
                        ),
                      }}
                    >
                      <StatusIcon
                        status={status.name}
                        iconPack={status.iconPack}
                        iconName={status.iconName}
                        className="h-3.5 w-3.5"
                        style={{ color: status.colorHex }}
                      />
                    </span>
                    <span className="truncate text-sm font-medium text-[#101011]">
                      {status.name}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-[#9A9CA2] tabular-nums">
                      {getStatusCount(status.name)}
                    </span>
                    <Check
                      size={15}
                      aria-hidden="true"
                      className={
                        selected ? "text-[#8771FF]" : "text-transparent"
                      }
                    />
                  </span>
                </button>
              );
            })}
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-3 text-center text-[0.8125rem] text-[#9A9CA2]">
                No status found.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
