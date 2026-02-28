import CalendarEmptyState from "@/components/calendar/CalendarEmptyState";
import PageHeader from "@/components/layout/PageHeader";

export default function CalendarPage() {
  return (
    <div className="flex h-full min-h-screen w-full flex-col bg-[#F8F7FF] text-[#101011]">
      <PageHeader
        title="Calendar"
        description="One calendar showing all calls, outcomes, and revenue across your team."
      />
      <CalendarEmptyState />
    </div>
  );
}
