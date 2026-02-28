interface CallEvent {
  date: string;
  tz: string;
  platform: string;
}

const calls: CallEvent[] = [
  { date: "12:00 - 12:45, Monday, January 15, 2026", tz: "Asia/Yerevan", platform: "Zoom" },
  { date: "9:00 - 9:45, Monday, January 19, 2026", tz: "Asia/Yerevan", platform: "Zoom" },
  { date: "7:00 - 7:45, Monday, January 20, 2026", tz: "Asia/Yerevan", platform: "Zoom" },
];

export default function CallsTab() {
  return (
    <div className="p-6 bg-[#F8F7FF] space-y-4 h-full overflow-y-auto">
      {calls.map((c, i) => (
        <div key={i} className="bg-white rounded-lg p-4 border border-[#F0F2F6] shadow-sm relative">
          <h4 className="font-bold text-[#101011] text-sm mb-3">Apply to Work 1-on-1 With Us</h4>

          <div className="flex items-center text-sm text-[#606266] mb-2">
            <img src="/icons/CalendarTab.svg" alt="Calendar" className="w-5 h-5 mr-3" />
            {c.date}
          </div>
          <div className="flex items-center text-sm text-[#606266] mb-2">
            <img src="/icons/World.svg" alt="World" className="w-5 h-5 mr-3" />
            {c.tz}
          </div>
          <div className="flex items-center text-sm text-[#606266] mb-4">
            <img src="/icons/Video.svg" alt="Video" className="w-5 h-5 mr-3" />
            {c.platform}
          </div>

          <div className="flex justify-end">
            <button className="bg-[#8771FF] text-white text-sm font-medium px-4 py-1.5 rounded-full hover:bg-[#7660EE]">Join Now</button>
          </div>
        </div>
      ))}
    </div>
  );
}
