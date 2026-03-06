"use client";

import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Phone,
  User,
} from "lucide-react";
import { useState } from "react";
import CalendarEventCard from "@/components/calendar/CalendarEventCard";
import type { CalendarEvent } from "@/components/calendar/calendarEventModel";
import {
  EVENT_STATUS_CONFIG,
  EVENT_TYPE_CONFIG,
} from "@/components/calendar/calendarEventModel";
import {
  DAY_NAMES,
  formatHour,
  getMonthGridDays,
  isSameDay,
  isToday,
  MONTH_NAMES,
  toDateKey,
} from "@/components/calendar/calendarUtils";

interface CalendarSidebarProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
  selectedEvent: CalendarEvent | null;
  onCloseEventDetail: () => void;
}

export default function CalendarSidebar({
  currentDate,
  events,
  onDateSelect,
  selectedEvent,
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
          <EventDetailView event={selectedEvent} onClose={onCloseEventDetail} />
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

/** Detail view shown when an event is clicked */
function EventDetailView({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const typeConfig = EVENT_TYPE_CONFIG[event.type];
  const statusConfig = EVENT_STATUS_CONFIG[event.status];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F0F2F6] p-4">
        <h3 className="text-sm font-semibold text-[#101011]">Event Details</h3>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#9A9CA2] hover:bg-[#F8F7FF] hover:text-[#606266]"
        >
          ✕
        </button>
      </div>

      <div className="p-4">
        {/* Type badge */}
        <div className="mb-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${typeConfig.bgClass} ${typeConfig.textClass} ${typeConfig.borderClass}`}
          >
            <span className={`h-2 w-2 rounded-full ${typeConfig.dotClass}`} />
            {typeConfig.label}
          </span>
        </div>

        {/* Lead name */}
        <h4 className="mb-1 text-lg font-bold text-[#101011]">
          {event.leadName}
        </h4>
        <p className="mb-4 text-sm text-[#606266]">{event.title}</p>

        {/* Details */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-[#F0F2F6] bg-[#FBFBFD] p-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F0FF]">
              <Clock size={14} className="text-[#8771FF]" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-[#9A9CA2]">
                Time
              </p>
              <p className="text-sm font-medium text-[#101011]">
                {formatHour(event.startHour)} ·{" "}
                {event.duration >= 1
                  ? `${event.duration}h`
                  : `${event.duration * 60}m`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#F0F2F6] bg-[#FBFBFD] p-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F0FF]">
              <User size={14} className="text-[#8771FF]" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-[#9A9CA2]">
                Assigned To
              </p>
              <p className="text-sm font-medium text-[#101011]">
                {event.assignedTo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#F0F2F6] bg-[#FBFBFD] p-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F0FF]">
              <CalendarClock size={14} className="text-[#8771FF]" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-[#9A9CA2]">
                Status
              </p>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusConfig.bgClass} ${statusConfig.textClass} ${statusConfig.borderClass}`}
              >
                {statusConfig.label}
              </span>
            </div>
          </div>

          {event.amount ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#F0F2F6] bg-[#FBFBFD] p-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                <DollarSign size={14} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-[#9A9CA2]">
                  Deal Value
                </p>
                <p className="text-sm font-bold text-emerald-700">
                  {event.amount}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
