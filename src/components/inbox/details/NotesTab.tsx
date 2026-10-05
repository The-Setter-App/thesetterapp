"use client";

interface NotesTabProps {
  notes: string;
  onChange: (next: string) => void;
}

export default function NotesTab({ notes, onChange }: NotesTabProps) {
  const maxChars = 4000;
  const remaining = maxChars - notes.length;

  return (
    <div className="p-5">
      <div className="h-64 rounded-2xl border border-[#F0F2F6] bg-white p-4 transition-colors duration-150 focus-within:border-[#8771FF]">
        <textarea
          aria-label="Notes"
          className="h-full w-full resize-none bg-transparent text-[0.9375rem] leading-relaxed text-[#101011] outline-none placeholder:text-[#9A9CA2] focus:outline-none focus:ring-0"
          value={notes}
          maxLength={maxChars}
          placeholder="Add notes about this lead, objections, and next step."
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] text-[#9A9CA2]">
          Saved per conversation. Keep key context here for the team.
        </p>
        <p
          className={`text-[11px] ${remaining < 200 ? "text-amber-600" : "text-[#9A9CA2]"}`}
        >
          {remaining} left
        </p>
      </div>
    </div>
  );
}
