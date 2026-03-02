"use client";

import { Clock, User } from "lucide-react";
import type { CSSProperties } from "react";
import type { CalendarEvent } from "@/components/calendar/calendarMockData";
import {
  EVENT_STATUS_CONFIG,
  EVENT_TYPE_CONFIG,
} from "@/components/calendar/calendarMockData";
import { formatHour } from "@/components/calendar/calendarUtils";

interface CalendarEventCardProps {
  event: CalendarEvent;
  /** "month" = tiny pill for month grid, "sidebar" = full card for sidebar list */
  variant: "month" | "sidebar";
  className?: string;
  style?: CSSProperties;
  onClick?: (event: CalendarEvent) => void;
}

export default function CalendarEventCard({
  event,
  variant,
  className = "",
  style,
  onClick,
}: CalendarEventCardProps) {
  const tc = EVENT_TYPE_CONFIG[event.type];
  const sc = EVENT_STATUS_CONFIG[event.status];

  // ── Month grid: tiny single-line pill ──
  if (variant === "month") {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick?.(event); }}
        className={`flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] font-medium transition-colors hover:opacity-80 ${tc.bgClass} ${tc.textClass} ${className}`}
        style={style}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tc.dotClass}`} />
        <span className="shrink-0 font-bold opacity-70">{formatHour(event.startHour)}</span>
        <span className="truncate">{event.leadName}</span>
      </button>
    );
  }

  // ── Sidebar: full detail card ──
  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      className={`group flex w-full flex-col gap-1.5 rounded-xl border p-3 text-left transition-all hover:shadow-md ${tc.bgClass} ${tc.borderClass} ${className}`}
      style={style}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${tc.dotClass}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${tc.textClass}`}>
              {tc.label}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-bold text-[#101011]">
            {event.leadName}
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${sc.bgClass} ${sc.textClass} ${sc.borderClass}`}>
          {sc.label}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-[#606266]">
        <span className="inline-flex items-center gap-1">
          <Clock size={11} className="text-[#9A9CA2]" />
          {formatHour(event.startHour)}
        </span>
        <span className="inline-flex items-center gap-1">
          <User size={11} className="text-[#9A9CA2]" />
          {event.assignedTo}
        </span>
      </div>
    </button>
  );
}
