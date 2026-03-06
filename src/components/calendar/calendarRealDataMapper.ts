import type { CalendarEvent } from "@/components/calendar/calendarEventModel";
import type { WorkspaceCalendarCallEvent } from "@/types/calendly";

function toCalendarStatus(
  status: WorkspaceCalendarCallEvent["status"],
): CalendarEvent["status"] {
  if (status === "booked" || status === "rescheduled") {
    return "confirmed";
  }
  if (status === "canceled") {
    return "cancelled";
  }
  return "pending";
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toDurationHours(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms) || ms <= 0) {
    return 0.5;
  }
  return Math.max(ms / (60 * 60 * 1000), 0.25);
}

export function mapWorkspaceCallEventsToCalendarEvents(
  events: WorkspaceCalendarCallEvent[],
): CalendarEvent[] {
  return events.map((event) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const validStart = Number.isFinite(start.getTime()) ? start : new Date();
    const validEnd = Number.isFinite(end.getTime()) ? end : validStart;
    const startHour = validStart.getHours() + validStart.getMinutes() / 60;

    return {
      id: event.id,
      title: event.title || "Scheduled Call",
      leadName:
        event.leadName ||
        event.inviteeName ||
        event.inviteeEmail ||
        "Unknown lead",
      type: "call",
      date: toDateKey(validStart),
      startHour,
      duration: toDurationHours(validStart, validEnd),
      status: toCalendarStatus(event.status),
      assignedTo: "You",
      amount: event.amount || undefined,
    };
  });
}
