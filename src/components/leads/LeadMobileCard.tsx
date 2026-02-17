"use client";

import { MoreVertical } from "lucide-react";
import CustomCheckbox from "@/components/leads/CustomCheckbox";
import StatusBadge from "@/components/leads/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import type { LeadRow } from "@/types/leads";

interface LeadMobileCardProps {
  lead: LeadRow;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

export default function LeadMobileCard({ lead, selected, onToggleSelect }: LeadMobileCardProps) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <CustomCheckbox checked={selected} onChange={() => onToggleSelect(lead.id)} />
          <Avatar src={lead.avatar} alt={lead.name} size="sm" />
          <div>
            <h3 className="text-sm font-semibold text-stone-900">{lead.name}</h3>
            <p className="text-xs text-stone-500">{lead.handle || "N/A"}</p>
          </div>
        </div>
        <button type="button" className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600">
          <MoreVertical size={16} />
        </button>
      </div>

      <div className="mt-3 space-y-3 pl-7">
        <StatusBadge status={lead.status} />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-stone-400">Cash</p>
            <p className="mt-0.5 text-stone-700">{lead.cash}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-stone-400">Interacted</p>
            <p className="mt-0.5 text-stone-700">{lead.interacted}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] uppercase tracking-wide text-stone-400">Account</p>
            <p className="mt-0.5 text-stone-700">{lead.account}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
