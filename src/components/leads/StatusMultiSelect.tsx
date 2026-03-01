"use client";

import { ChevronDown, Search } from "lucide-react";
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
          open
            ? "border-[#DDD6FF] bg-[#F3F0FF] text-[#8771FF]"
            : selectedStatuses.length > 0
              ? "border-[#E6E1FF] bg-[#F8F7FF] text-[#8771FF]"
              : "border-[#F0F2F6] bg-white text-[#101011] hover:bg-[#F8F7FF]"
        }`}
      >
        {selectedStatuses.length > 0
          ? `${selectedStatuses.length} statuses`
          : "Any status"}
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-[#F0F2F6] bg-white p-2 shadow-sm">
          <div className="relative mb-2">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#9A9CA2]">
              <Search className="h-3.5 w-3.5" />
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search statuses"
              className="h-9 w-full rounded-lg border border-[#F0F2F6] bg-white pl-8 pr-3 text-xs text-[#101011] placeholder:text-[#9A9CA2] outline-none"
            />
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto">
            {filteredOptions.map((status) => {
              const selected = selectedStatuses.includes(status.name);
              return (
                <button
                  type="button"
                  key={status.id}
                  onClick={() => onToggleStatus(status.name)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-[#F8F7FF]"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md"
                      style={{
                        backgroundColor: toStatusColorRgba(status.colorHex, 0.18),
                      }}
                    >
                      <StatusIcon
                        status={status.name}
                        iconPack={status.iconPack}
                        iconName={status.iconName}
                        className="h-4 w-4"
                        style={{ color: status.colorHex }}
                      />
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: status.colorHex }}
                    >
                      {status.name}
                    </span>
                  </span>

                  <span className="flex items-center gap-2">
                    <span className="text-xs text-[#9A9CA2]">
                      {getStatusCount(status.name)}
                    </span>
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        selected
                          ? "border-[#8771FF] bg-[#8771FF] text-white"
                          : "border-[#D8DAE0] bg-white text-transparent"
                      }`}
                    >
                      •
                    </span>
                  </span>
                </button>
              );
            })}
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-[#9A9CA2]">
                No status found.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
