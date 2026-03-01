"use client";

import CustomCheckbox from "@/components/leads/CustomCheckbox";
import LeadDesktopRow from "@/components/leads/LeadDesktopRow";
import LeadsPagination from "@/components/leads/LeadsPagination";
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
  currentPage: number;
  pageCount: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={`h-4 w-4 transition-transform ${active && asc ? "rotate-180" : ""} ${
        active ? "opacity-100" : "opacity-30"
      }`}
    >
      <path
        fillRule="evenodd"
        d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SortHeader({
  label,
  column,
  sortConfig,
  onSort,
}: {
  label: string;
  column: keyof LeadRow;
  sortConfig: SortConfig;
  onSort: (key: keyof LeadRow) => void;
}) {
  const active = sortConfig?.key === column;
  const asc = sortConfig?.direction === "asc";

  return (
    <th
      onClick={() => onSort(column)}
      className="cursor-pointer px-4 py-3 text-left text-xs font-semibold text-[#606266] transition-colors hover:bg-[#F8F7FF] md:px-6"
    >
      <span className="flex items-center gap-1 select-none">
        {label}
        <SortIcon active={Boolean(active)} asc={Boolean(asc)} />
      </span>
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
  currentPage,
  pageCount,
  rowsPerPage,
  totalCount,
  onPageChange,
}: LeadsTableDesktopProps) {
  return (
    <div className="hidden min-h-0 flex-1 flex-col overflow-hidden border-b border-[#F0F2F6] bg-white md:flex">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="h-12 border-b border-[#F0F2F6] bg-[#FDFDFF]">
              <th className="w-12 px-4 py-3 text-center md:px-6">
                <div className="flex items-center justify-center">
                  <CustomCheckbox
                    checked={headerCheckboxState}
                    onChange={onToggleAllVisible}
                  />
                </div>
              </th>
              <SortHeader
                label="Lead Name"
                column="name"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <SortHeader
                label="Username"
                column="handle"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <SortHeader
                label="Status"
                column="status"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <SortHeader
                label="Cash Collected"
                column="cash"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <SortHeader
                label="Assigned To"
                column="assignedTo"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <SortHeader
                label="Account"
                column="account"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <SortHeader
                label="Interacted"
                column="interacted"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <th className="w-10 px-4 py-3 md:px-6" />
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
      <LeadsPagination
        page={currentPage}
        pageCount={pageCount}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={onPageChange}
      />
    </div>
  );
}
