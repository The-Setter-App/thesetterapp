"use client";

import type { CalendarEvent } from "@/components/calendar/calendarEventModel";
import { EVENT_TYPE_CONFIG } from "@/components/calendar/calendarEventModel";
import {
  computeOverlapLayout,
  END_HOUR,
  getEventStyle,
  HOUR_HEIGHT,
  START_HOUR,
} from "@/components/calendar/calendarTimeGrid";
import {
  DAY_NAMES,
  formatHour,
  getWeekDays,
  isToday,
  toDateKey,
} from "@/components/calendar/calendarUtils";

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export default function CalendarWeekView({
  currentDate,
  events,
  onEventClick,
}: Props) {
  const weekDays = getWeekDays(currentDate);

  const byDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const arr = byDate.get(ev.date) ?? [];
    arr.push(ev);
    byDate.set(ev.date, arr);
  }

  const hours: number[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {/* Shared scroll context keeps day headers and time-grid columns aligned */}
      <div className="flex flex-1 overflow-y-auto bg-[#F8F7FF]">
        <div className="flex min-h-full min-w-0 flex-1 flex-col">
          {/* ── Day Headers ── */}
          <div className="sticky top-0 z-20 flex shrink-0 border-b border-[#E8E8EC] bg-white">
            <div className="w-[52px] shrink-0 border-r border-[#E8E8EC]" />
            <div className="grid flex-1 grid-cols-7">
              {weekDays.map((day) => {
                const t = isToday(day);
                return (
                  <div
                    key={toDateKey(day)}
                    className="flex flex-col items-center gap-0.5 border-r border-[#E8E8EC] py-2"
                  >
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wider ${t ? "text-[#8771FF]" : "text-[#9A9CA2]"}`}
                    >
                      {DAY_NAMES[day.getDay()]}
                    </span>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${t ? "bg-[#8771FF] text-white" : "text-[#101011]"}`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Time Grid ── */}
          <div className="flex flex-1 bg-[#F8F7FF]">
            {/* Time gutter */}
            <div className="min-h-full w-[52px] shrink-0 border-r border-[#E8E8EC] bg-[#F8F7FF]">
              {hours.map((h) => (
                <div
                  key={h}
                  style={{ height: HOUR_HEIGHT }}
                  className="relative"
                >
                  <span
                    className={`absolute right-2 text-[10px] font-medium text-[#9A9CA2] ${h === START_HOUR ? "top-1" : "-top-[7px]"}`}
                  >
                    {formatHour(h)}
                  </span>
                </div>
              ))}
            </div>

            {/* 7 day columns */}
            <div className="grid min-h-full flex-1 grid-cols-7">
              {weekDays.map((day) => {
                const key = toDateKey(day);
                const dayEvs = byDate.get(key) ?? [];
                const t = isToday(day);
                const layout = computeOverlapLayout(dayEvs);

                return (
                  <div
                    key={key}
                    className={`relative border-r border-[#E8E8EC] ${t ? "bg-[#FBFAFF]" : "bg-[#F8F7FF]"}`}
                  >
                    {hours.map((h) => (
                      <div
                        key={h}
                        style={{ height: HOUR_HEIGHT }}
                        className="border-b border-[#F0F0F4]"
                      />
                    ))}

                    {/* Event chips — side by side when overlapping */}
                    {dayEvs.map((ev) => {
                      const pos = getEventStyle(ev.startHour, ev.duration);
                      if (!pos) return null;
                      const c = EVENT_TYPE_CONFIG[ev.type];
                      const ol = layout.get(ev.id);
                      if (!ol) return null;

                      const colPct = 100 / ol.totalColumns;
                      const leftPct = ol.column * colPct;

                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => onEventClick(ev)}
                          className={`absolute z-10 flex cursor-pointer flex-col overflow-hidden rounded-md border px-1.5 py-1 text-left transition-shadow hover:shadow-md ${c.bgClass} ${c.borderClass}`}
                          style={{
                            top: pos.top,
                            height: pos.height,
                            left: `calc(${leftPct}% + 1px)`,
                            width: `calc(${colPct}% - 2px)`,
                          }}
                        >
                          <span
                            className={`block truncate text-[10px] font-bold leading-tight ${c.textClass}`}
                          >
                            {ev.leadName}
                          </span>
                          <span className="block truncate text-[9px] font-medium leading-tight text-[#606266]">
                            {ev.assignedTo}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
