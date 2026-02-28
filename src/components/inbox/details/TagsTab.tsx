"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MAX_CONVERSATION_TAGS } from "@/lib/inbox/tagValidation";
import type { TagRow } from "@/types/tags";

interface TagsTabProps {
  availableTags: TagRow[];
  selectedTagIds: string[];
  loading: boolean;
  onChangeTagIds: (nextTagIds: string[]) => void;
}

function categoryClassName(category: TagRow["category"]): string {
  if (category === "Priority") {
    return "bg-[#F3F0FF] text-[#8771FF]";
  }
  if (category === "Lead Stage") {
    return "bg-[#EEF6FF] text-[#2C6CD6]";
  }
  if (category === "Intent") {
    return "bg-[#FFF6EA] text-[#B46B16]";
  }
  if (category === "Follow Up") {
    return "bg-[#ECFBF3] text-[#1D8F5A]";
  }
  return "bg-[#F5F6F8] text-[#606266]";
}

export default function TagsTab({
  availableTags,
  selectedTagIds,
  loading,
  onChangeTagIds,
}: TagsTabProps) {
  const [search, setSearch] = useState("");
  const [limitMessage, setLimitMessage] = useState("");

  const availableById = useMemo(() => {
    return new Map(availableTags.map((tag) => [tag.id, tag]));
  }, [availableTags]);

  const selectedTags = useMemo(() => {
    return selectedTagIds
      .map((tagId) => availableById.get(tagId))
      .filter((tag): tag is TagRow => Boolean(tag));
  }, [availableById, selectedTagIds]);

  const filteredTags = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return availableTags;

    return availableTags.filter((tag) => {
      const haystack =
        `${tag.name} ${tag.category} ${tag.description}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [availableTags, search]);

  function toggleTag(tagId: string) {
    setLimitMessage("");
    if (selectedTagIds.includes(tagId)) {
      onChangeTagIds(selectedTagIds.filter((id) => id !== tagId));
      return;
    }

    if (selectedTagIds.length >= MAX_CONVERSATION_TAGS) {
      setLimitMessage(`Limit reached (${MAX_CONVERSATION_TAGS} tags max).`);
      return;
    }

    onChangeTagIds([...selectedTagIds, tagId]);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="border-b border-[#F0F2F6] px-4 py-3">
        <div className="mb-2 text-xs font-semibold text-[#606266]">
          Selected tags ({selectedTagIds.length}/{MAX_CONVERSATION_TAGS})
        </div>

        {selectedTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className="inline-flex items-center gap-1 rounded-full border border-[#E2E5EB] bg-white px-2.5 py-1 text-xs font-semibold text-[#2B2B2C] hover:bg-[#F8F7FF]"
              >
                <span>{tag.name}</span>
                <span className="text-[10px] text-[#9A9CA2]">x</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#9A9CA2]">No tags assigned yet.</p>
        )}

        <div className="relative mt-3">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#9A9CA2]">
            <Search size={14} aria-hidden="true" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tags"
            className="h-10 w-full rounded-xl border border-[#F0F2F6] bg-white pl-9 pr-3 text-sm font-medium text-[#101011] placeholder:text-[#9A9CA2] outline-none transition-colors hover:bg-[#F8F7FF] focus:outline-none focus:ring-0"
          />
        </div>

        {limitMessage ? (
          <p className="mt-2 text-xs font-medium text-red-600">
            {limitMessage}
          </p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="px-2 py-6 text-center text-xs font-medium text-[#606266]">
            Loading tags...
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs font-medium text-[#606266]">
            No tags found.
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                    selected
                      ? "border-[#D9D2FF] bg-[#F8F7FF]"
                      : "border-[#F0F2F6] bg-white hover:bg-[#FAFAFC]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#101011]">
                        {tag.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#606266]">
                        {tag.description}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${categoryClassName(tag.category)}`}
                    >
                      {tag.category}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

