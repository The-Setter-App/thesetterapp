"use client";

import LeadAvatar from "@/components/inbox/LeadAvatar";
import CustomCheckbox from "@/components/leads/CustomCheckbox";
import OpenConversationLink from "@/components/leads/OpenConversationLink";
import StatusBadge from "@/components/leads/StatusBadge";
import type { LeadRow } from "@/types/leads";
import type { TagRow } from "@/types/tags";

interface LeadMobileCardProps {
  lead: LeadRow;
  statusOptions: TagRow[];
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

interface LeadFact {
  label: string;
  value: string;
}

export default function LeadMobileCard({
  lead,
  statusOptions,
  selected,
  onToggleSelect,
}: LeadMobileCardProps) {
  const facts: LeadFact[] = [
    { label: "Cash", value: lead.cash },
    { label: "Interacted", value: lead.interacted },
    { label: "Assigned to", value: lead.assignedTo },
    { label: "Account", value: lead.account },
  ];

  return (
    <article
      className={`rounded-2xl border p-3 transition-colors duration-100 ${
        selected ? "border-[#DCD5FF] bg-[#F8F7FF]" : "border-[#F0F2F6] bg-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <CustomCheckbox
          checked={selected}
          onChange={() => onToggleSelect(lead.id)}
          label={`Select ${lead.name}`}
        />
        <LeadAvatar
          conversationId={lead.id}
          src={lead.avatar}
          alt={lead.name}
          className="h-8 w-8 shrink-0 rounded-full bg-[#F4F5F8] object-cover"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[0.9375rem] font-semibold text-[#101011]">
            {lead.name}
          </h3>
          <p className="truncate text-xs text-[#9A9CA2]">
            {lead.handle || "N/A"}
          </p>
        </div>
        <OpenConversationLink conversationId={lead.id} leadName={lead.name} />
      </div>

      <div className="mt-3 pl-10">
        <StatusBadge status={lead.status} statusOptions={statusOptions} />
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-[11px] text-[#9A9CA2]">{fact.label}</dt>
              <dd className="mt-0.5 truncate text-[0.8125rem] font-medium text-[#101011] tabular-nums">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
