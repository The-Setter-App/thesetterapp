"use client";

import type { TagRow } from "@/types/tags";
import type { TagsSettingsEditFormState } from "./types";
import TagsTableRow from "./TagsTableRow";

interface TagsTableProps {
  allTags: TagRow[];
  editForm: TagsSettingsEditFormState;
}

export default function TagsTable({ allTags, editForm }: TagsTableProps) {
  return (
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
              Description
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
          {allTags.map((tagRow) => (
            <TagsTableRow key={tagRow.id} tagRow={tagRow} editForm={editForm} />
          ))}
        </tbody>
      </table>
    </div>
  );
}