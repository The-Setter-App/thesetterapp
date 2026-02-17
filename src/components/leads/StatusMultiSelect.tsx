"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  STATUS_COLOR_ICON_PATHS,
  STATUS_OPTIONS,
  STATUS_TEXT_CLASS_MAP,
} from "@/lib/status/config";
import type { StatusType } from "@/types/status";

interface StatusMultiSelectProps {
  selectedStatuses: StatusType[];
  onToggleStatus: (status: StatusType) => void;
  getStatusCount: (status: StatusType) => number;
}

export default function StatusMultiSelect({
  selectedStatuses,
  onToggleStatus,
  getStatusCount,
}: StatusMultiSelectProps) {
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
          open || selectedStatuses.length > 0
            ? "border-stone-900 bg-stone-900 text-white"
            : "border-stone-200 bg-white text-stone-800 hover:bg-stone-50"
        }`}
      >
        {selectedStatuses.length > 0 ? `${selectedStatuses.length} statuses` : "Any status"}
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-stone-200 bg-white p-2 shadow-md">
          <div className="space-y-1">
            {STATUS_OPTIONS.map((status) => {
              const selected = selectedStatuses.includes(status);

              return (
                <button
                  type="button"
                  key={status}
                  onClick={() => onToggleStatus(status)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-stone-50"
                >
                  <span className="flex items-center gap-2">
                    <img src={STATUS_COLOR_ICON_PATHS[status]} alt="" className="h-4 w-4" />
                    <span className={`text-sm font-medium ${STATUS_TEXT_CLASS_MAP[status]}`}>{status}</span>
                  </span>

                  <span className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">{getStatusCount(status)}</span>
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        selected
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-300 bg-white text-transparent"
                      }`}
                    >
                      •
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
