"use client";

import { MoreVertical } from "lucide-react";
import CustomCheckbox from "@/components/leads/CustomCheckbox";
import StatusBadge from "@/components/leads/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import type { LeadRow } from "@/types/leads";

interface LeadDesktopRowProps {
  lead: LeadRow;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

export default function LeadDesktopRow({
  lead,
  selected,
  onToggleSelect,
}: LeadDesktopRowProps) {
  return (
    <tr className="h-14 border-b border-[#F3F4F7] text-sm hover:bg-[#FAF9FF]">
      <td className="px-4 py-3 text-center md:px-6">
        <div className="flex items-center justify-center">
          <CustomCheckbox
            checked={selected}
            onChange={() => onToggleSelect(lead.id)}
          />
        </div>
      </td>
      <td className="px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Avatar src={lead.avatar} alt={lead.name} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-[#101011]">
                {lead.name}
              </span>
              {lead.messageCount ? (
                <span className="inline-flex h-5 items-center gap-1 rounded-full bg-[#8771FF] px-1.5 text-[10px] font-semibold text-white">
                  <img
                    src="/icons/MessageCount.svg"
                    alt="Unread"
                    className="h-3 w-3"
                  />
                  {lead.messageCount}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-[#606266] md:px-6">
        {lead.handle || <span className="italic text-[#9A9CA2]">N/A</span>}
      </td>
      <td className="px-4 py-3 md:px-6">
        <StatusBadge status={lead.status} />
      </td>
      <td className="px-4 py-3 text-[#606266] md:px-6">{lead.cash}</td>
      <td className="px-4 py-3 text-[#606266] md:px-6">{lead.assignedTo}</td>
      <td className="px-4 py-3 text-[#606266] md:px-6">{lead.account}</td>
      <td className="px-4 py-3 whitespace-nowrap text-[#606266] md:px-6">
        {lead.interacted}
      </td>
      <td className="px-4 py-3 text-center md:px-6">
        <button
          type="button"
          className="rounded-lg p-2 text-[#9A9CA2] hover:bg-[#F8F7FF] hover:text-[#606266]"
        >
          <MoreVertical size={16} />
        </button>
      </td>
    </tr>
  );
}
