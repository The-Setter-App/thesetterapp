interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
}

export default function MetricCard({ label, value, subValue, icon }: MetricCardProps) {
  return (
    <div className="bg-[#F6F5FF] p-6 rounded-xl flex flex-col justify-between h-[140px] relative overflow-hidden">
      {/* Header with Icon */}
      <div className="flex justify-between items-start z-10">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#7C3AED] shadow-sm">
          {icon}
        </div>
      </div>
      
      {/* Content */}
      <div className="mt-2 z-10">
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        <div className="flex items-center gap-1 text-sm font-medium text-gray-600 mt-1">
          {label}
        </div>
        {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
      </div>
    </div>
  );
}