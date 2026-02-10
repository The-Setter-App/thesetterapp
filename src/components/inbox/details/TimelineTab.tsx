const StarIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 5.25V4.5z" clipRule="evenodd" />
  </svg>
);

interface TimelineEvent {
  id: number;
  title: string;
  sub: string;
  date: string;
  icon: React.ReactNode;
  bg: string;
}

export default function TimelineTab() {
  const events: TimelineEvent[] = [
    {
      id: 1,
      title: "New Lead",
      sub: "Ready to contact",
      date: "Dec 30",
      icon: <img src="/icons/timeline-status/NewLead.svg" alt="New Lead" className="w-5 h-5" />,
      bg: "bg-[#F89EE3]",
    },
    {
      id: 2,
      title: "Qualified",
      sub: "Lead is qualified",
      date: "Jan 6",
      icon: <StarIcon className="w-5 h-5 text-white" />,
      bg: "bg-[#FFC300]",
    },
    {
      id: 3,
      title: "Call Booked",
      sub: "Lead booked a call",
      date: "Jan 7",
      icon: <PhoneIcon className="w-5 h-5 text-white" />,
      bg: "bg-[#501884]",
    },
    {
      id: 4,
      title: "In-Contact",
      sub: "Speaking over WhatsApp",
      date: "Jan 10",
      icon: <img src="/icons/timeline-status/InContact.svg" alt="In-Contact" className="w-5 h-5" />,
      bg: "bg-[#25D366]",
    },
    {
      id: 5,
      title: "Won",
      sub: "Lead has paid",
      date: "Just Now",
      icon: <img src="/icons/timeline-status/Won.svg" alt="Won" className="w-5 h-5" />,
      bg: "bg-[#059700]",
    },
  ];

  return (
    <div className="p-6 max-h-96 overflow-y-auto">
      <div className="flex flex-col">
        {events.map((e, idx) => (
          <div key={e.id} className="flex gap-x-4">
            {/* Left Column: Icon + Vertical Line */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center z-10 ${e.bg}`}>
                {e.icon}
              </div>
              {idx !== events.length - 1 && (
                <div className="flex-1 w-px border-l-2 border-solid border-gray-200 my-2" />
              )}
            </div>
            {/* Right Column: Content */}
            <div className={`flex-1 pt-1 ${idx !== events.length - 1 ? "pb-8" : ""}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{e.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{e.sub}</div>
                </div>
                <span className="text-xs text-gray-400 text-right min-w-[60px]">{e.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}