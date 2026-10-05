"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CalendarContentSkeleton from "@/components/calendar/CalendarContentSkeleton";
import CalendarDayView from "@/components/calendar/CalendarDayView";
import CalendarIntegrationRequiredState from "@/components/calendar/CalendarIntegrationRequiredState";
import CalendarMonthGrid from "@/components/calendar/CalendarMonthGrid";
import CalendarSelectedEventDialog from "@/components/calendar/CalendarSelectedEventDialog";
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
import { PAGE_GUTTER_CLASS } from "@/components/layout/pageGutter";
import surface from "@/components/ui/brandSurface.module.css";
import { useCalendarEventDetail } from "@/hooks/useCalendarEventDetail";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useCalendlyConnectionState } from "@/hooks/useCalendlyConnectionState";
import { toCalendarMonthPath } from "@/lib/calendarRoute";

interface CalendarPageClientProps {
  // The month named in the URL, as a year and a 0-based month index. They are
  // numbers rather than a Date so the month cannot shift between the
  // server's timezone and the viewer's.
  initialYear?: number;
  initialMonthIndex?: number;
}

function toMonthStart(year?: number, monthIndex?: number): Date | null {
  if (year === undefined || monthIndex === undefined) return null;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) return null;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return new Date(year, monthIndex, 1);
}

export default function CalendarPageClient({
  initialYear,
  initialMonthIndex,
}: CalendarPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentDate, setCurrentDate] = useState(
    () => toMonthStart(initialYear, initialMonthIndex) ?? new Date(),
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

  const {
    events: workspaceCallEvents,
    loading: eventsLoading,
    error: eventsError,
  } = useCalendarEvents({
    enabled: calendlyConnected,
    fromIso: visibleRange.fromIso,
    toIso: visibleRange.toIso,
  });

  const events = useMemo(
    () => mapWorkspaceCallEventsToCalendarEvents(workspaceCallEvents),
    [workspaceCallEvents],
  );
  const {
    eventDetail: selectedEventDetail,
    loading: selectedEventDetailLoading,
    error: selectedEventDetailError,
  } = useCalendarEventDetail({
    enabled: calendlyConnected && selectedEvent !== null,
    eventId: selectedEvent?.id ?? null,
  });

  // Follow the URL when it names a different month (back/forward, a link).
  useEffect(() => {
    const incoming = toMonthStart(initialYear, initialMonthIndex);
    if (!incoming) return;
    setCurrentDate((prev) => {
      if (
        prev.getMonth() === incoming.getMonth() &&
        prev.getFullYear() === incoming.getFullYear()
      ) {
        return prev;
      }
      return incoming;
    });
  }, [initialYear, initialMonthIndex]);

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
  const showCalendarLoadingState =
    connectionLoading ||
    (calendlyConnected && eventsLoading && events.length === 0);
  const showIntegrationState = !connectionLoading && !calendlyConnected;
  const showCalendarShell = !eventsError && !showIntegrationState;

  return (
    <div
      className={`${surface.surface} flex h-full w-full flex-col overflow-hidden text-[#101011]`}
    >
      <PageHeader
        divider={false}
        className="shrink-0"
        title="Calendar"
        description="All calls, outcomes, and revenue across your team in one place."
        titleBadge={
          <span className="inline-flex h-6 items-center rounded-full bg-[#F3F0FF] px-2.5 text-xs font-semibold text-[#8771FF] tabular-nums">
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
        <div className={`${PAGE_GUTTER_CLASS} min-h-0 flex-1`}>
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {eventsError}
          </p>
        </div>
      ) : null}

      {showCalendarLoadingState ? <CalendarContentSkeleton compact /> : null}

      {showIntegrationState ? (
        <CalendarIntegrationRequiredState
          canManageIntegration={canManageIntegration}
        />
      ) : null}

      {showCalendarShell && !showCalendarLoadingState ? (
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
            onEventClick={handleEventClick}
            selectedEvent={selectedEvent}
            selectedEventDetail={selectedEventDetail}
            selectedEventDetailLoading={selectedEventDetailLoading}
            selectedEventDetailError={selectedEventDetailError}
            onCloseEventDetail={handleCloseEventDetail}
          />

          <CalendarSelectedEventDialog
            event={selectedEvent}
            detail={selectedEventDetail}
            detailLoading={selectedEventDetailLoading}
            detailError={selectedEventDetailError}
            onClose={handleCloseEventDetail}
          />
        </div>
      ) : null}
    </div>
  );
}
