"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CalendarDayView from "@/components/calendar/CalendarDayView";
import CalendarIntegrationRequiredState from "@/components/calendar/CalendarIntegrationRequiredState";
import CalendarMonthGrid from "@/components/calendar/CalendarMonthGrid";
import CalendarSidebar from "@/components/calendar/CalendarSidebar";
import type { CalendarViewMode } from "@/components/calendar/CalendarToolbar";
import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import CalendarWeekView from "@/components/calendar/CalendarWeekView";
import type { CalendarEvent } from "@/components/calendar/calendarEventModel";
import { getCalendarVisibleRange } from "@/components/calendar/calendarRange";
import { mapWorkspaceCallEventsToCalendarEvents } from "@/components/calendar/calendarRealDataMapper";
import {
  addDays,
  addMonths,
  addWeeks,
} from "@/components/calendar/calendarUtils";
import PageHeader from "@/components/layout/PageHeader";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useCalendlyConnectionState } from "@/hooks/useCalendlyConnectionState";
import { toCalendarMonthPath } from "@/lib/calendarRoute";

interface CalendarPageClientProps {
  initialDate?: Date;
}

export default function CalendarPageClient({
  initialDate,
}: CalendarPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentDate, setCurrentDate] = useState(
    () => initialDate ?? new Date(),
  );
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const {
    connected: calendlyConnected,
    canManageIntegration,
    loading: connectionLoading,
  } = useCalendlyConnectionState();

  const visibleRange = useMemo(
    () => getCalendarVisibleRange(currentDate, viewMode),
    [currentDate, viewMode],
  );

  const { events: workspaceCallEvents, error: eventsError } = useCalendarEvents(
    {
      enabled: calendlyConnected,
      fromIso: visibleRange.fromIso,
      toIso: visibleRange.toIso,
    },
  );

  const events = useMemo(
    () => mapWorkspaceCallEventsToCalendarEvents(workspaceCallEvents),
    [workspaceCallEvents],
  );

  useEffect(() => {
    if (!initialDate) return;
    const incomingMonth = initialDate.getMonth();
    const incomingYear = initialDate.getFullYear();
    setCurrentDate((prev) => {
      if (
        prev.getMonth() === incomingMonth &&
        prev.getFullYear() === incomingYear
      ) {
        return prev;
      }
      return initialDate;
    });
  }, [initialDate]);

  useEffect(() => {
    const nextPath = toCalendarMonthPath(currentDate);
    if (pathname === nextPath) return;
    router.replace(nextPath);
  }, [currentDate, pathname, router]);

  const handleNavigate = (direction: -1 | 0 | 1) => {
    if (direction === 0) {
      setCurrentDate(new Date());
      return;
    }
    switch (viewMode) {
      case "month":
        setCurrentDate((prev) => addMonths(prev, direction));
        break;
      case "week":
        setCurrentDate((prev) => addWeeks(prev, direction));
        break;
      case "day":
        setCurrentDate((prev) => addDays(prev, direction));
        break;
    }
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleCloseEventDetail = () => {
    setSelectedEvent(null);
  };

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
  };

  const todayEventsCount = events.filter((event) => {
    const d = new Date();
    const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return event.date === todayKey;
  }).length;
  const showIntegrationState = !connectionLoading && !calendlyConnected;
  const showCalendarShell = !eventsError && !showIntegrationState;

  return (
    <div className="flex h-full min-h-screen w-full flex-col bg-white text-[#101011]">
      <PageHeader
        title="Calendar"
        description="All calls, outcomes, and revenue across your team in one place."
        titleBadge={
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F0FF] px-2.5 py-1 text-xs font-semibold text-[#8771FF]">
            {todayEventsCount} today
          </span>
        }
      />

      <CalendarToolbar
        currentDate={currentDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNavigate={handleNavigate}
      />

      {eventsError ? (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-[#F8F7FF] p-6">
          <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {eventsError}
          </div>
        </div>
      ) : null}

      {showIntegrationState ? (
        <CalendarIntegrationRequiredState
          canManageIntegration={canManageIntegration}
        />
      ) : null}

      {showCalendarShell ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {viewMode === "month" ? (
              <CalendarMonthGrid
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
                onDayClick={handleDayClick}
              />
            ) : viewMode === "week" ? (
              <CalendarWeekView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
              />
            ) : (
              <CalendarDayView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
              />
            )}
          </div>

          <CalendarSidebar
            currentDate={currentDate}
            events={events}
            onDateSelect={handleDateSelect}
            selectedEvent={selectedEvent}
            onCloseEventDetail={handleCloseEventDetail}
          />
        </div>
      ) : null}
    </div>
  );
}
