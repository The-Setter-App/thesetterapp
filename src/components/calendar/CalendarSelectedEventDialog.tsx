"use client";

import CalendarEventDetailsPanel from "@/components/calendar/CalendarEventDetailsPanel";
import type { CalendarEvent } from "@/components/calendar/calendarEventModel";
import type { WorkspaceCalendarCallEvent } from "@/types/calendly";

interface CalendarSelectedEventDialogProps {
  event: CalendarEvent | null;
  detail: WorkspaceCalendarCallEvent | null;
  detailLoading: boolean;
  detailError: string;
  onClose: () => void;
}

// Below `lg` there is no side panel, so the selected event's details open
// over the calendar instead.
export default function CalendarSelectedEventDialog({
  event,
  detail,
  detailLoading,
  detailError,
  onClose,
}: CalendarSelectedEventDialogProps) {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#101011]/40 p-3 backdrop-blur-[2px] lg:hidden">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Event details"
        className="flex h-full w-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_64px_rgba(16,16,17,0.2)]"
      >
        <CalendarEventDetailsPanel
          event={event}
          detail={detail}
          detailLoading={detailLoading}
          detailError={detailError}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
