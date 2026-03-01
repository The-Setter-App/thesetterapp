import { LuCalendar, LuGlobe, LuVideo } from "react-icons/lu";

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
    <div className="p-6 bg-gray-50 space-y-4 h-full overflow-y-auto">
      {calls.map((c, i) => (
        <div key={i} className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm relative">
          <h4 className="font-bold text-gray-800 text-sm mb-3">Apply to Work 1-on-1 With Us</h4>

          <div className="flex items-center text-sm text-gray-600 mb-2">
            <LuCalendar className="mr-3 h-5 w-5" aria-label="Calendar" />
            {c.date}
          </div>
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <LuGlobe className="mr-3 h-5 w-5" aria-label="World" />
            {c.tz}
          </div>
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <LuVideo className="mr-3 h-5 w-5" aria-label="Video" />
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
