"use client";

import { LuMessageCircle } from "react-icons/lu";
import CustomCheckbox from "@/components/leads/CustomCheckbox";
import OpenConversationLink from "@/components/leads/OpenConversationLink";
import StatusBadge from "@/components/leads/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import type { LeadRow } from "@/types/leads";
import type { TagRow } from "@/types/tags";

interface LeadDesktopRowProps {
  lead: LeadRow;
  statusOptions: TagRow[];
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

const CELL_CLASS = "px-3 py-2.5";
const TEXT_CELL_CLASS = `${CELL_CLASS} text-[#606266]`;

export default function LeadDesktopRow({
  lead,
  statusOptions,
  selected,
  onToggleSelect,
}: LeadDesktopRowProps) {
  return (
    <tr
      className={`h-[3.75rem] border-b border-[#F0F2F6] text-sm transition-colors duration-100 ${
        selected ? "bg-[#F8F7FF]" : "[@media(hover:hover)]:hover:bg-[#FBFAFF]"
      }`}
    >
      <td className="py-2.5 pl-4 pr-1 md:pl-6 lg:pl-8">
        <CustomCheckbox
          checked={selected}
          onChange={() => onToggleSelect(lead.id)}
          label={`Select ${lead.name}`}
        />
      </td>
      <td className={CELL_CLASS}>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            src={lead.avatar}
            alt={lead.name}
            size="sm"
            className="shrink-0"
          />
          <span className="truncate font-semibold text-[#101011]">
            {lead.name}
          </span>
          {lead.messageCount ? (
            <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-[#8771FF] px-1.5 text-[10px] font-semibold text-white tabular-nums">
              <LuMessageCircle className="h-3 w-3" aria-label="Unread" />
              {lead.messageCount}
            </span>
          ) : null}
        </div>
      </td>
      <td className={TEXT_CELL_CLASS}>
        {lead.handle || <span className="text-[#9A9CA2]">N/A</span>}
      </td>
      <td className={CELL_CLASS}>
        <StatusBadge status={lead.status} statusOptions={statusOptions} />
      </td>
      <td className={`${CELL_CLASS} font-medium text-[#101011] tabular-nums`}>
        {lead.cash}
      </td>
      <td className={TEXT_CELL_CLASS}>{lead.assignedTo}</td>
      <td className={TEXT_CELL_CLASS}>{lead.account}</td>
      <td className={`${TEXT_CELL_CLASS} whitespace-nowrap tabular-nums`}>
        {lead.interacted}
      </td>
      <td className="py-2.5 pl-1 pr-4 text-right md:pr-6 lg:pr-8">
        <OpenConversationLink conversationId={lead.id} leadName={lead.name} />
      </td>
    </tr>
  );
}
