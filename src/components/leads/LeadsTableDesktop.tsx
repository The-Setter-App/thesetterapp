"use client";

import { ChevronDown } from "lucide-react";
import CustomCheckbox from "@/components/leads/CustomCheckbox";
import LeadDesktopRow from "@/components/leads/LeadDesktopRow";
import type { LeadRow, SortConfig } from "@/types/leads";
import type { TagRow } from "@/types/tags";

interface LeadsTableDesktopProps {
  rows: LeadRow[];
  statusOptions: TagRow[];
  sortConfig: SortConfig;
  onSort: (key: keyof LeadRow) => void;
  onToggleSelect: (id: string) => void;
  onToggleAllVisible: () => void;
  isSelected: (id: string) => boolean;
  headerCheckboxState: boolean | "indeterminate";
}

interface SortableColumn {
  label: string;
  key: keyof LeadRow;
}

const SORTABLE_COLUMNS: SortableColumn[] = [
  { label: "Lead", key: "name" },
  { label: "Username", key: "handle" },
  { label: "Status", key: "status" },
  { label: "Cash collected", key: "cash" },
  { label: "Assigned to", key: "assignedTo" },
  { label: "Account", key: "account" },
  { label: "Interacted", key: "interacted" },
];

// The header stays put while the rows scroll under it. Its divider is an
// inset shadow because a border on a sticky cell scrolls away with the table.
const HEADER_CELL_CLASS =
  "sticky top-0 z-10 bg-white shadow-[inset_0_-1px_0_#F0F2F6]";

interface SortHeaderProps {
  column: SortableColumn;
  sortConfig: SortConfig;
  onSort: (key: keyof LeadRow) => void;
}

function SortHeader({ column, sortConfig, onSort }: SortHeaderProps) {
  const active = sortConfig?.key === column.key;
  const ascending = active && sortConfig?.direction === "asc";

  return (
    <th
      scope="col"
      aria-sort={active ? (ascending ? "ascending" : "descending") : "none"}
      className={`${HEADER_CELL_CLASS} px-3 py-0 text-left`}
    >
      <button
        type="button"
        onClick={() => onSort(column.key)}
        className={`-ml-2 inline-flex h-9 select-none items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium outline-none transition-colors duration-100 ${
          active
            ? "text-[#101011]"
            : "text-[#9A9CA2] [@media(hover:hover)]:hover:text-[#606266]"
        }`}
      >
        {column.label}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`transition-[transform,opacity] duration-150 ${
            ascending ? "rotate-180" : ""
          } ${active ? "opacity-100" : "opacity-0"}`}
        />
      </button>
    </th>
  );
}

export default function LeadsTableDesktop({
  rows,
  statusOptions,
  sortConfig,
  onSort,
  onToggleSelect,
  onToggleAllVisible,
  isSelected,
  headerCheckboxState,
}: LeadsTableDesktopProps) {
  return (
    <div className="hidden min-h-0 flex-1 overflow-auto md:block">
      <table className="w-full min-w-[60rem] border-collapse">
        <thead>
          <tr className="h-11">
            <th
              scope="col"
              className={`${HEADER_CELL_CLASS} w-14 py-0 pl-4 pr-1 text-left md:pl-6 lg:pl-8`}
            >
              <CustomCheckbox
                checked={headerCheckboxState}
                onChange={onToggleAllVisible}
                label="Select all leads on this page"
              />
            </th>
            {SORTABLE_COLUMNS.map((column) => (
              <SortHeader
                key={column.key}
                column={column}
                sortConfig={sortConfig}
                onSort={onSort}
              />
            ))}
            <th
              scope="col"
              className={`${HEADER_CELL_CLASS} w-16 py-0 pl-1 pr-4 md:pr-6 lg:pr-8`}
            >
              <span className="sr-only">Open conversation</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((lead) => (
            <LeadDesktopRow
              key={lead.id}
              lead={lead}
              statusOptions={statusOptions}
              selected={isSelected(lead.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
