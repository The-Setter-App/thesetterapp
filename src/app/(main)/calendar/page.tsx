import { redirect } from "next/navigation";
import { toCalendarMonthPath } from "@/lib/calendarRoute";

export default function CalendarPage() {
  redirect(toCalendarMonthPath(new Date()));
}
