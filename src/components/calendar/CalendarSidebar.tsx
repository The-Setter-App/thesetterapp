"use client";

import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Phone,
} from "lucide-react";
import { useState } from "react";
import CalendarEventCard from "@/components/calendar/CalendarEventCard";
import CalendarEventDetailsPanel from "@/components/calendar/CalendarEventDetailsPanel";
import type { CalendarEvent } from "@/components/calendar/calendarEventModel";
import { EVENT_TYPE_CONFIG } from "@/components/calendar/calendarEventModel";
import {
  DAY_NAMES,
  getMonthGridDays,
  isSameDay,
  isToday,
  MONTH_NAMES,
  toDateKey,
} from "@/components/calendar/calendarUtils";
import type { WorkspaceCalendarCallEvent } from "@/types/calendly";

interface CalendarSidebarProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
  selectedEvent: CalendarEvent | null;
  selectedEventDetail: WorkspaceCalendarCallEvent | null;
  selectedEventDetailLoading: boolean;
  selectedEventDetailError: string;
  onCloseEventDetail: () => void;
}

export default function CalendarSidebar({
  currentDate,
  events,
  onDateSelect,
  selectedEvent,
  selectedEventDetail,
  selectedEventDetailLoading,
  selectedEventDetailError,
  onCloseEventDetail,
}: CalendarSidebarProps) {
  const [miniMonth, setMiniMonth] = useState(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
  );

  const miniDays = getMonthGridDays(
    miniMonth.getFullYear(),
    miniMonth.getMonth(),
  );

  // Upcoming events (today + future, sorted by date then hour, max 5)
  const todayKey = toDateKey(new Date());
  const upcoming = events
    .filter((e) => e.date >= todayKey && e.status !== "cancelled")
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.startHour - b.startHour;
    })
    .slice(0, 5);

  // Quick stats
  const todayEvents = events.filter((e) => e.date === todayKey);
  const confirmedCount = todayEvents.filter(
    (e) => e.status === "confirmed",
  ).length;
  const pendingCount = todayEvents.filter((e) => e.status === "pending").length;
  const totalRevenue = events
    .filter((e) => e.amount && e.status !== "cancelled")
    .reduce((sum, e) => {
      const num = Number.parseFloat(e.amount?.replace(/[$,]/g, "") ?? "0");
      return sum + num;
    }, 0);

  // Event type counts for legend
  const typeCounts = new Map<string, number>();
  for (const event of events) {
    typeCounts.set(event.type, (typeCounts.get(event.type) ?? 0) + 1);
  }

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col border-l border-[#F0F2F6] bg-white lg:flex">
      <div className="flex-1 overflow-y-auto">
        {/* Selected event detail */}
        {selectedEvent ? (
          <CalendarEventDetailsPanel
            event={selectedEvent}
            detail={selectedEventDetail}
            detailLoading={selectedEventDetailLoading}
            detailError={selectedEventDetailError}
            onClose={onCloseEventDetail}
          />
        ) : (
          <>
            {/* Mini Calendar */}
            <div className="border-b border-[#F0F2F6] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#101011]">
                  {MONTH_NAMES[miniMonth.getMonth()]} {miniMonth.getFullYear()}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setMiniMonth(
                        new Date(
                          miniMonth.getFullYear(),
                          miniMonth.getMonth() - 1,
                          1,
                        ),
                      )
                    }
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#9A9CA2] hover:bg-[#F8F7FF] hover:text-[#606266]"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMiniMonth(
                        new Date(
                          miniMonth.getFullYear(),
                          miniMonth.getMonth() + 1,
                          1,
                        ),
                      )
                    }
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#9A9CA2] hover:bg-[#F8F7FF] hover:text-[#606266]"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Day name headers */}
              <div className="mb-1 grid grid-cols-7 gap-0.5">
                {DAY_NAMES.map((name) => (
                  <span
                    key={name}
                    className="text-center text-[10px] font-semibold uppercase text-[#9A9CA2]"
                  >
                    {name.slice(0, 2)}
                  </span>
                ))}
              </div>

              {/* Mini grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {miniDays.slice(0, 35).map((day) => {
                  const key = toDateKey(day);
                  const isMonth = day.getMonth() === miniMonth.getMonth();
                  const dayIsToday = isToday(day);
                  const isSelected = isSameDay(day, currentDate);
                  const hasEvents = events.some((e) => e.date === key);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onDateSelect(day)}
                      className={`relative inline-flex h-7 w-full items-center justify-center rounded-md text-[11px] font-medium transition-colors ${
                        isSelected
                          ? "bg-[#8771FF] text-white"
                          : dayIsToday
                            ? "bg-[#F3F0FF] text-[#6d5ed6] font-semibold"
                            : isMonth
                              ? "text-[#101011] hover:bg-[#F8F7FF]"
                              : "text-[#C4C6CC]"
                      }`}
                    >
                      {day.getDate()}
                      {hasEvents && !isSelected ? (
                        <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#8771FF]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="border-b border-[#F0F2F6] p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9A9CA2]">
                Today&apos;s Overview
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] p-3">
                  <div className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(135,113,255,0.15)]">
                    <Phone size={13} className="text-[#8771FF]" />
                  </div>
                  <p className="text-lg font-bold text-[#101011]">
                    {todayEvents.length}
                  </p>
                  <p className="text-[10px] font-medium text-[#606266]">
                    Total Events
                  </p>
                </div>
                <div className="rounded-xl border border-[#F0F2F6] bg-emerald-50 p-3">
                  <div className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
                    <CalendarClock size={13} className="text-emerald-600" />
                  </div>
                  <p className="text-lg font-bold text-[#101011]">
                    {confirmedCount}
                  </p>
                  <p className="text-[10px] font-medium text-[#606266]">
                    Confirmed
                  </p>
                </div>
                <div className="rounded-xl border border-[#F0F2F6] bg-amber-50 p-3">
                  <div className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
                    <Clock size={13} className="text-amber-600" />
                  </div>
                  <p className="text-lg font-bold text-[#101011]">
                    {pendingCount}
                  </p>
                  <p className="text-[10px] font-medium text-[#606266]">
                    Pending
                  </p>
                </div>
                <div className="rounded-xl border border-[#F0F2F6] bg-[#F3F0FF] p-3">
                  <div className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(135,113,255,0.15)]">
                    <DollarSign size={13} className="text-[#8771FF]" />
                  </div>
                  <p className="text-lg font-bold text-[#101011]">
                    ${totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-medium text-[#606266]">
                    Pipeline
                  </p>
                </div>
              </div>
            </div>

            {/* Event Types Legend */}
            <div className="border-b border-[#F0F2F6] p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9A9CA2]">
                Event Types
              </h3>
              <div className="flex flex-col gap-2">
                {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${config.dotClass}`}
                      />
                      <span className="text-xs font-medium text-[#101011]">
                        {config.label}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.bgClass} ${config.textClass} ${config.borderClass}`}
                    >
                      {typeCounts.get(type) ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9A9CA2]">
                Upcoming
              </h3>
              {upcoming.length === 0 ? (
                <p className="text-xs text-[#9A9CA2]">No upcoming events</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {upcoming.map((event) => (
                    <CalendarEventCard
                      key={event.id}
                      event={event}
                      variant="sidebar"
                      onClick={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
