import { redirect } from "next/navigation";
import CalendarPageClient from "@/components/calendar/CalendarPageClient";
import {
  parseCalendarMonthSlug,
  toCalendarMonthPath,
} from "@/lib/calendarRoute";

export default async function CalendarMonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  const now = new Date();
  const initialDate = parseCalendarMonthSlug({
    month,
    year: now.getFullYear(),
  });

  if (!initialDate) {
    redirect(toCalendarMonthPath(now));
  }

  return <CalendarPageClient initialDate={initialDate} />;
}
