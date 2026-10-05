"use client";

import { Clock, User } from "lucide-react";
import type { CSSProperties } from "react";
import type { CalendarEvent } from "@/components/calendar/calendarEventModel";
import {
  EVENT_STATUS_CONFIG,
  EVENT_TYPE_CONFIG,
} from "@/components/calendar/calendarEventModel";
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
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(event);
        }}
        className={`flex h-5 w-full items-center gap-1 rounded-md px-1.5 text-left text-[11px] font-medium outline-none transition-opacity duration-100 [@media(hover:hover)]:hover:opacity-80 ${tc.bgClass} ${tc.textClass} ${className}`}
        style={style}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tc.dotClass}`} />
        <span className="shrink-0 tabular-nums opacity-70">
          {formatHour(event.startHour)}
        </span>
        <span className="truncate font-semibold">{event.leadName}</span>
      </button>
    );
  }

  // ── Sidebar: full detail card ──
  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      className={`flex w-full flex-col gap-2 rounded-2xl border border-[#F0F2F6] bg-white p-3 text-left outline-none transition-[transform,background-color] duration-100 ease-out active:scale-[0.98] [@media(hover:hover)]:hover:bg-[#F8F7FF] ${className}`}
      style={style}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${tc.dotClass}`} />
          <p className="truncate text-sm font-semibold text-[#101011]">
            {event.leadName}
          </p>
        </div>
        <span
          className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-semibold ${sc.bgClass} ${sc.textClass}`}
        >
          {sc.label}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-4 text-xs text-[#606266]">
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Clock size={12} aria-hidden="true" className="text-[#9A9CA2]" />
          {formatHour(event.startHour)}
        </span>
        <span className="inline-flex items-center gap-1">
          <User size={12} aria-hidden="true" className="text-[#9A9CA2]" />
          {event.assignedTo}
        </span>
      </div>
    </button>
  );
}
