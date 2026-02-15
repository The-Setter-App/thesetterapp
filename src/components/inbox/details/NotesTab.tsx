"use client";

interface NotesTabProps {
  notes: string;
  onChange: (next: string) => void;
}

export default function NotesTab({ notes, onChange }: NotesTabProps) {

  return (
    <div className="p-6">
      <div className="border border-gray-100 rounded-xl p-4 shadow-sm bg-white h-64">
        <textarea
          className="text-gray-700 font-bold text-sm w-full h-full resize-none outline-none"
          value={notes}
          placeholder="Add notes about this lead, objections, and next step."
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <p className="mt-2 text-[11px] text-gray-400">Saved per conversation. Keep key context here for the team.</p>
    </div>
  );
}
