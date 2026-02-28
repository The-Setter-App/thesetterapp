"use client";

interface NotesTabProps {
  notes: string;
  onChange: (next: string) => void;
}

export default function NotesTab({ notes, onChange }: NotesTabProps) {
  const maxChars = 4000;
  const remaining = maxChars - notes.length;

  return (
    <div className="p-6">
      <div className="border border-[#F0F2F6] rounded-xl p-4 shadow-sm bg-white h-64">
        <textarea
          className="text-[#606266] font-bold text-sm w-full h-full resize-none outline-none"
          value={notes}
          maxLength={maxChars}
          placeholder="Add notes about this lead, objections, and next step."
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] text-[#9A9CA2]">Saved per conversation. Keep key context here for the team.</p>
        <p className={`text-[11px] ${remaining < 200 ? "text-amber-600" : "text-[#9A9CA2]"}`}>{remaining} left</p>
      </div>
    </div>
  );
}

