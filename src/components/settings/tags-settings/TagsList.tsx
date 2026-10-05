"use client";

import { useState } from "react";
import { SETTINGS_BLOCK_CLASS } from "@/components/settings/settingsStyles";
import type { TagRow } from "@/types/tags";
import TagsListRow from "./TagsListRow";
import type { TagsSettingsEditFormState } from "./types";

interface TagsListProps {
  allTags: TagRow[];
  editForm: TagsSettingsEditFormState;
}

const PAGE_SIZE = 25;

export default function TagsList({ allTags, editForm }: TagsListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleTags = allTags.slice(0, visibleCount);
  const hasMore = visibleCount < allTags.length;

  if (allTags.length === 0) {
    return (
      <p className={`${SETTINGS_BLOCK_CLASS} text-sm text-[#606266]`}>
        No statuses yet. Add one to start sorting your leads.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-[#F0F2F6]">
        {visibleTags.map((tagRow) => (
          <TagsListRow key={tagRow.id} tagRow={tagRow} editForm={editForm} />
        ))}
      </ul>

      {hasMore ? (
        <div
          className={`${SETTINGS_BLOCK_CLASS} flex items-center justify-between gap-3 border-t border-[#F0F2F6] !py-3`}
        >
          <span className="text-sm tabular-nums text-[#606266]">
            Showing {visibleTags.length} of {allTags.length}
          </span>
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold text-[#8771FF] outline-none transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-[#F3F0FF]"
          >
            Show more
          </button>
        </div>
      ) : null}
    </>
  );
}
