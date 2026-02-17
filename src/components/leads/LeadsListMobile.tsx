"use client";

import LeadMobileCard from "@/components/leads/LeadMobileCard";
import type { LeadRow } from "@/types/leads";

interface LeadsListMobileProps {
  rows: LeadRow[];
  isSelected: (id: string) => boolean;
  onToggleSelect: (id: string) => void;
}

export default function LeadsListMobile({ rows, isSelected, onToggleSelect }: LeadsListMobileProps) {
  return (
    <div className="space-y-3 md:hidden">
      {rows.map((lead) => (
        <LeadMobileCard
          key={lead.id}
          lead={lead}
          selected={isSelected(lead.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
