import React from 'react';

interface MetricCardProps {
  value: string;
  label: string;
  icon: React.ReactNode;
}

const MetricCard = ({ value, label, icon }: MetricCardProps) => (
  <div
    className="p-6 rounded-2xl flex items-center gap-4 flex-1"
    style={{ background: 'rgba(135, 113, 255, 0.10)' }}
  >
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center"
      style={{ background: '#5235EF' }}
    >
      {icon}
    </div>
    <div>
      <div
        style={{
          width: '100%',
          color: '#101011',
          fontSize: 22,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          wordWrap: 'break-word'
        }}
      >
        {value}
      </div>
      <div
        style={{
          width: '100%',
          color: 'black',
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          wordWrap: 'break-word'
        }}
      >
        {label}
      </div>
    </div>
  </div>
);

export default MetricCard;import { Card } from '@/components/ui/Card';

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
}

export default function MetricCard({ label, value, subValue, icon }: MetricCardProps) {
  return (
    <Card className="bg-[#F6F5FF] border-none flex flex-col justify-between h-[150px] relative overflow-hidden transition-all hover:shadow-md">
      {/* Header with Icon */}
      <div className="flex justify-between items-start z-10">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#7C3AED] shadow-sm">
          {icon}
        </div>
      </div>
      
      {/* Content */}
      <div className="mt-4 z-10">
        <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
        <div className="flex items-center gap-1 text-sm font-medium text-gray-500 mt-1">
          {label}
        </div>
        {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
      </div>
    </Card>
  );
}