import { Card } from '@/components/ui/Card';
import type { ReactNode } from 'react';

export default function SettingsSectionCard({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <Card noPadding className="overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white shadow-sm">
      <div className="border-b border-[#F0F2F6] px-6 py-6 md:px-8">
        {badge ? (
          <div className="mb-2 inline-flex items-center rounded-full bg-[rgba(135,113,255,0.1)] px-3 py-1 text-xs font-semibold text-[#8771FF]">
            {badge}
          </div>
        ) : null}
        <h2 className="text-lg font-bold text-[#101011]">{title}</h2>
        <p className="mt-0.5 text-sm text-[#606266]">{description}</p>
      </div>
      {children}
    </Card>
  );
}
