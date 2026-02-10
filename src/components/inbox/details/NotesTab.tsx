"use client";

import { useState } from "react";

export default function NotesTab() {
  const [notes, setNotes] = useState("Guy said he wants to become a astronaut I guess");

  return (
    <div className="p-6">
      <div className="border border-gray-100 rounded-xl p-4 shadow-sm bg-white h-64">
        <textarea
          className="text-gray-700 font-bold text-sm w-full h-full resize-none outline-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </div>
  );
}