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
      <div className="border border-gray-100 rounded-xl p-4 shadow-sm bg-white h-64">
        <textarea
          className="text-gray-700 font-bold text-sm w-full h-full resize-none outline-none"
          value={notes}
          maxLength={maxChars}
          placeholder="Add notes about this lead, objections, and next step."
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] text-gray-400">Saved per conversation. Keep key context here for the team.</p>
        <p className={`text-[11px] ${remaining < 200 ? "text-amber-600" : "text-gray-400"}`}>{remaining} left</p>
      </div>
    </div>
  );
}
