import { LuClock } from "react-icons/lu";

// Shown in place of the message box once Instagram's reply window has
// closed, so nobody writes a message that cannot be delivered.
export default function MessagingWindowClosedNotice() {
  return (
    <div className="shrink-0 bg-white px-4 pb-4 pt-2 md:px-6">
      <div className="flex items-start gap-3 rounded-3xl bg-[#F8F7FF] px-4 py-3.5">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#8771FF]"
        >
          <LuClock className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-semibold text-[#101011]">
            The reply window has closed
          </p>
          <p className="mt-0.5 text-sm leading-snug text-[#606266]">
            Instagram only allows a message within 7 days of the lead's last
            one. You can reply here again as soon as they write to you.
          </p>
        </div>
      </div>
    </div>
  );
}
