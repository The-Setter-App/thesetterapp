import { ArrowRight, CalendarClock, Plus } from "lucide-react";
import Link from "next/link";

export default function CalendarEmptyState() {
  return (
    <section className="flex min-h-0 flex-1 w-full items-center justify-center bg-[#F8F7FF] px-4 py-8 md:px-6 lg:px-8">
      <div className="w-full max-w-3xl rounded-3xl border border-[#F0F2F6] bg-white p-6 shadow-sm md:p-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D8D2FF] bg-[#F3F0FF] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#6d5ed6]">
          <CalendarClock size={14} />
          Calendar
        </div>

        <div className="grid gap-6 md:grid-cols-[auto,1fr] md:items-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-[rgba(135,113,255,0.12)] text-[#8771FF]">
            <CalendarClock size={34} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-[#101011] md:text-3xl">
              No events scheduled yet
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#606266] md:text-base">
              Your calendar will show booked calls, outcomes, and follow-ups in
              one timeline. Start by creating your first event or reviewing
              active conversations.
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 md:flex-row md:items-center">
          <Link
            href="/inbox"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#8771FF] px-5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-[#6d5ed6] active:scale-95 md:w-auto"
          >
            <Plus size={16} />
            Start from Inbox
          </Link>
          <Link
            href="/leads"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#F3F0FF] px-5 text-sm font-semibold text-[#8771FF] transition-colors hover:bg-[#EBE5FF] md:w-auto"
          >
            View leads
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
