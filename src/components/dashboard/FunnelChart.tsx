export default function FunnelChart() {
  const funnelData = [
    { label: 'Conversations', value: '10,891' },
    { label: 'Qualified', value: '2,390' },
    { label: 'Links Sent', value: '861' },
    { label: 'Booked', value: '246' },
    { label: 'Closed', value: '82' }
  ];

  return (
    <div className="border border-gray-100 rounded-2xl p-0 overflow-hidden shadow-sm bg-white h-[320px]">
      <div className="relative h-full w-full flex">
        
        {/* Funnel Background Graphic */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pt-16">
          <svg 
            width="100%" 
            height="100%" 
            viewBox="0 0 1000 300" 
            preserveAspectRatio="none" 
            className="w-full h-full"
          >
            <defs>
              <linearGradient id="funnelGradient" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#8B5CF6" /> {/* Vivid Purple */}
                <stop offset="100%" stopColor="#E9D5FF" /> {/* Light Lavender */}
              </linearGradient>
            </defs>
            
            {/* Custom SVG Path to match exact curvature */}
            <path 
              d="M0,50 
                C 250,55 500,80 750,115
                L 1000,125 
                L 1000,175
                L 750,185
                C 500,220 250,245 0,250 
                Z" 
              fill="url(#funnelGradient)"
            />
          </svg>
        </div>

        {/* Data Overlay Grid */}
        <div className="relative z-10 grid grid-cols-5 w-full h-full">
          {funnelData.map((item, index) => (
            <div 
              key={item.label} 
              className={`flex flex-col pt-8 pl-6 h-full ${index !== 4 ? 'border-r border-gray-100' : ''}`}
            >
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{item.label}</span>
              <span className="text-3xl font-bold text-[#7C3AED] mt-2">{item.value}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}