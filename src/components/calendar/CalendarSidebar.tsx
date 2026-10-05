"use client";

import CalendarEventCard from "@/components/calendar/CalendarEventCard";
import CalendarEventDetailsPanel from "@/components/calendar/CalendarEventDetailsPanel";
import CalendarMiniMonth from "@/components/calendar/CalendarMiniMonth";
import CalendarTodayStats from "@/components/calendar/CalendarTodayStats";
import CalendarTypeLegend from "@/components/calendar/CalendarTypeLegend";
import type { CalendarEvent } from "@/components/calendar/calendarEventModel";
import { toDateKey } from "@/components/calendar/calendarUtils";
import type { WorkspaceCalendarCallEvent } from "@/types/calendly";

interface CalendarSidebarProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  selectedEvent: CalendarEvent | null;
  selectedEventDetail: WorkspaceCalendarCallEvent | null;
  selectedEventDetailLoading: boolean;
  selectedEventDetailError: string;
  onCloseEventDetail: () => void;
}

const MAX_UPCOMING_EVENTS = 5;

// Today and later, soonest first, leaving out cancelled calls.
function getUpcomingEvents(
  events: CalendarEvent[],
  todayKey: string,
): CalendarEvent[] {
  return events
    .filter((event) => event.date >= todayKey && event.status !== "cancelled")
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.startHour - b.startHour;
    })
    .slice(0, MAX_UPCOMING_EVENTS);
}

export default function CalendarSidebar({
  currentDate,
  events,
  onDateSelect,
  onEventClick,
  selectedEvent,
  selectedEventDetail,
  selectedEventDetailLoading,
  selectedEventDetailError,
  onCloseEventDetail,
}: CalendarSidebarProps) {
  const todayKey = toDateKey(new Date());
  const upcoming = getUpcomingEvents(events, todayKey);

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col border-l border-t border-[#F0F2F6] bg-white lg:flex">
      <div className="flex-1 overflow-y-auto">
        {selectedEvent ? (
          <CalendarEventDetailsPanel
            event={selectedEvent}
            detail={selectedEventDetail}
            detailLoading={selectedEventDetailLoading}
            detailError={selectedEventDetailError}
            onClose={onCloseEventDetail}
          />
        ) : (
          <div className="space-y-6 p-5">
            <CalendarMiniMonth
              currentDate={currentDate}
              events={events}
              onDateSelect={onDateSelect}
            />
            <CalendarTodayStats events={events} todayKey={todayKey} />
            <CalendarTypeLegend events={events} />

            <section>
              <h3 className="mb-2.5 text-sm font-semibold text-[#101011]">
                Upcoming
              </h3>
              {upcoming.length === 0 ? (
                <p className="rounded-2xl bg-[#F8F7FF] p-4 text-[0.8125rem] text-[#606266]">
                  No upcoming events.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {upcoming.map((event) => (
                    <CalendarEventCard
                      key={event.id}
                      event={event}
                      variant="sidebar"
                      onClick={onEventClick}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}
