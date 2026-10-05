"use client";

import LeadMobileCard from "@/components/leads/LeadMobileCard";
import type { LeadRow } from "@/types/leads";
import type { TagRow } from "@/types/tags";

interface LeadsListMobileProps {
  rows: LeadRow[];
  statusOptions: TagRow[];
  isSelected: (id: string) => boolean;
  onToggleSelect: (id: string) => void;
}

export default function LeadsListMobile({
  rows,
  statusOptions,
  isSelected,
  onToggleSelect,
}: LeadsListMobileProps) {
  return (
    <div className="flex-1 space-y-2 px-4 pb-4 md:hidden">
      {rows.map((lead) => (
        <LeadMobileCard
          key={lead.id}
          lead={lead}
          statusOptions={statusOptions}
          selected={isSelected(lead.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
