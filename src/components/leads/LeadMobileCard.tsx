"use client";

import { MoreVertical } from "lucide-react";
import CustomCheckbox from "@/components/leads/CustomCheckbox";
import StatusBadge from "@/components/leads/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import type { LeadRow } from "@/types/leads";
import type { TagRow } from "@/types/tags";

interface LeadMobileCardProps {
  lead: LeadRow;
  statusOptions: TagRow[];
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

export default function LeadMobileCard({
  lead,
  statusOptions,
  selected,
  onToggleSelect,
}: LeadMobileCardProps) {
  return (
    <article className="border-b border-[#F0F2F6] px-4 py-4 last:border-b-0">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <CustomCheckbox
            checked={selected}
            onChange={() => onToggleSelect(lead.id)}
          />
          <Avatar src={lead.avatar} alt={lead.name} size="sm" />
          <div>
            <h3 className="text-sm font-semibold text-[#101011]">
              {lead.name}
            </h3>
            <p className="text-xs text-[#606266]">{lead.handle || "N/A"}</p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg p-1 text-[#9A9CA2] hover:bg-[#F8F7FF] hover:text-[#606266]"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      <div className="mt-3 space-y-3 pl-7">
        <StatusBadge status={lead.status} statusOptions={statusOptions} />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#9A9CA2]">
              Cash
            </p>
            <p className="mt-0.5 text-[#606266]">{lead.cash}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#9A9CA2]">
              Interacted
            </p>
            <p className="mt-0.5 text-[#606266]">{lead.interacted}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] uppercase tracking-wide text-[#9A9CA2]">
              Account
            </p>
            <p className="mt-0.5 text-[#606266]">{lead.account}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
