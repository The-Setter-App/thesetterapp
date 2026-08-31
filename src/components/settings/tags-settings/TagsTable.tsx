"use client";

import { useState } from "react";
import type { TagRow } from "@/types/tags";
import TagsTableRow from "./TagsTableRow";
import type { TagsSettingsEditFormState } from "./types";

interface TagsTableProps {
  allTags: TagRow[];
  editForm: TagsSettingsEditFormState;
}

const PAGE_SIZE = 25;

export default function TagsTable({ allTags, editForm }: TagsTableProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleTags = allTags.slice(0, visibleCount);
  const hasMore = visibleCount < allTags.length;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-[#F0F2F6]">
        <table className="w-full min-w-[900px] border-collapse bg-white">
          <thead className="bg-[#F8F7FF] text-left">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#606266]">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#606266]">
                Source
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#606266]">
                Role
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#606266]">
                Description (AI criteria)
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#606266]">
                Color
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#606266]">
                Created
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#606266]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleTags.map((tagRow) => (
              <TagsTableRow
                key={tagRow.id}
                tagRow={tagRow}
                editForm={editForm}
              />
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="flex items-center justify-between px-1 text-sm text-[#606266]">
          <span>
            Showing {visibleTags.length} of {allTags.length} statuses
          </span>
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="rounded-xl border border-[#F0F2F6] px-4 py-2 font-medium text-[#8771FF] transition-colors hover:bg-[#F8F7FF]"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
