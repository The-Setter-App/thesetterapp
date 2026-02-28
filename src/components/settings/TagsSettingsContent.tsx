"use client";

import { CheckCircle2, CircleAlert, Plus, Tag } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import TagCategoryDropdown from "@/components/settings/TagCategoryDropdown";
import TagRowActionsMenu from "@/components/settings/TagRowActionsMenu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { setCachedInboxTags } from "@/lib/cache";
import { broadcastInboxTagCatalogChanged } from "@/lib/inbox/clientTagCatalogSync";
import {
  hasDuplicateTagName,
  MAX_TAG_DESCRIPTION_LENGTH,
  MAX_TAG_NAME_LENGTH,
  normalizeTagText,
  PRESET_TAG_ROWS,
} from "@/lib/tags/config";
import type { TagCategory, TagRow } from "@/types/tags";

interface TagsSettingsContentProps {
  currentUser: {
    email: string;
    displayName?: string;
  };
  initialCustomTags: TagRow[];
}

interface CreateTagResponse {
  tag?: TagRow;
  error?: string;
}

interface DeleteTagResponse {
  success?: boolean;
  error?: string;
}

function CategoryBadge({ category }: { category: TagCategory }) {
  return (
    <Badge
      variant="outline"
      className="border-[#F0F2F6] bg-[#F8F7FF] text-[#606266]"
    >
      {category}
    </Badge>
  );
}

function SourceBadge({ source }: { source: TagRow["source"] }) {
  return source === "Preset" ? (
    <Badge
      variant="secondary"
      className="bg-[rgba(135,113,255,0.1)] text-[#8771FF]"
    >
      Preset
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-[#F0F2F6] bg-white text-[#606266]"
    >
      Custom
    </Badge>
  );
}

function SummaryMetric({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#606266]">
        {title}
      </p>
      <p className="mt-1 text-2xl font-bold text-[#101011]">{value}</p>
      <p className="mt-0.5 text-xs text-[#606266]">{subtitle}</p>
    </div>
  );
}

export default function TagsSettingsContent({
  currentUser,
  initialCustomTags,
}: TagsSettingsContentProps) {
  const [customTags, setCustomTags] = useState<TagRow[]>(initialCustomTags);
  const [tagName, setTagName] = useState("");
  const [tagCategory, setTagCategory] = useState<TagCategory>("Custom");
  const [tagDescription, setTagDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [activeEditTagId, setActiveEditTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagCategory, setEditTagCategory] = useState<TagCategory>("Custom");
  const [editTagDescription, setEditTagDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  const allTags = useMemo(
    () => [...PRESET_TAG_ROWS, ...customTags],
    [customTags],
  );
  const normalizedTagName = normalizeTagText(tagName);
  const normalizedTagDescription = normalizeTagText(tagDescription);
  const canAddTag = normalizedTagName.length > 0 && !isCreating && !isUpdating;

  function resetEditState() {
    setActiveEditTagId(null);
    setEditTagName("");
    setEditTagCategory("Custom");
    setEditTagDescription("");
  }

  function beginEditTag(tag: TagRow) {
    if (tag.source !== "Custom") return;
    setErrorMessage("");
    setSuccessMessage("");
    setActiveEditTagId(tag.id);
    setEditTagName(tag.name);
    setEditTagCategory(tag.category);
    setEditTagDescription(
      tag.description === "No description added" ? "" : tag.description,
    );
  }

  async function syncInboxTagCatalogCache(nextCustomTags: TagRow[]) {
    const nextAssignableTags = [...PRESET_TAG_ROWS, ...nextCustomTags];
    await setCachedInboxTags(nextAssignableTags);
    broadcastInboxTagCatalogChanged(nextAssignableTags);
  }

  async function handleAddCustomTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!normalizedTagName) {
      setErrorMessage("Tag name is required.");
      return;
    }

    if (normalizedTagName.length > MAX_TAG_NAME_LENGTH) {
      setErrorMessage(
        `Tag name must be ${MAX_TAG_NAME_LENGTH} characters or fewer.`,
      );
      return;
    }

    if (normalizedTagDescription.length > MAX_TAG_DESCRIPTION_LENGTH) {
      setErrorMessage(
        `Description must be ${MAX_TAG_DESCRIPTION_LENGTH} characters or fewer.`,
      );
      return;
    }

    if (hasDuplicateTagName(normalizedTagName, allTags)) {
      setErrorMessage("Tag name already exists. Use a different name.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/settings/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedTagName,
          category: tagCategory,
          description: normalizedTagDescription,
        }),
      });
      const payload = (await response.json()) as CreateTagResponse;
      if (!response.ok || !payload.tag) {
        throw new Error(payload.error || "Failed to create tag.");
      }

      const nextCustomTags = [payload.tag as TagRow, ...customTags];
      setCustomTags(nextCustomTags);
      setTagName("");
      setTagCategory("Custom");
      setTagDescription("");
      setSuccessMessage(
        `"${payload.tag.name}" was saved by ${
          currentUser.displayName || currentUser.email
        }.`,
      );
      await syncInboxTagCatalogCache(nextCustomTags);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create tag.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveEditedTag() {
    if (!activeEditTagId) return;
    setErrorMessage("");
    setSuccessMessage("");

    const normalizedEditTagName = normalizeTagText(editTagName);
    const normalizedEditTagDescription = normalizeTagText(editTagDescription);
    if (!normalizedEditTagName) {
      setErrorMessage("Tag name is required.");
      return;
    }
    if (normalizedEditTagName.length > MAX_TAG_NAME_LENGTH) {
      setErrorMessage(
        `Tag name must be ${MAX_TAG_NAME_LENGTH} characters or fewer.`,
      );
      return;
    }
    if (normalizedEditTagDescription.length > MAX_TAG_DESCRIPTION_LENGTH) {
      setErrorMessage(
        `Description must be ${MAX_TAG_DESCRIPTION_LENGTH} characters or fewer.`,
      );
      return;
    }

    const existingRowsExcludingCurrent = allTags.filter(
      (tag) => tag.id !== activeEditTagId,
    );
    if (
      hasDuplicateTagName(normalizedEditTagName, existingRowsExcludingCurrent)
    ) {
      setErrorMessage("Tag name already exists. Use a different name.");
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(
        `/api/settings/tags/${encodeURIComponent(activeEditTagId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: normalizedEditTagName,
            category: editTagCategory,
            description: normalizedEditTagDescription,
          }),
        },
      );
      const payload = (await response.json()) as CreateTagResponse;
      if (!response.ok || !payload.tag) {
        throw new Error(payload.error || "Failed to update tag.");
      }

      const nextCustomTags = customTags.map((row) =>
        row.id === activeEditTagId ? (payload.tag as TagRow) : row,
      );
      setCustomTags(nextCustomTags);
      setSuccessMessage(`"${payload.tag.name}" was updated.`);
      resetEditState();
      await syncInboxTagCatalogCache(nextCustomTags);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update tag.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteTag(tagId: string) {
    const target = customTags.find((tag) => tag.id === tagId);
    if (!target) return;

    const confirmed = window.confirm(`Delete "${target.name}"?`);
    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");
    setDeletingTagId(tagId);
    try {
      const response = await fetch(
        `/api/settings/tags/${encodeURIComponent(tagId)}`,
        {
          method: "DELETE",
        },
      );
      const payload = (await response.json()) as DeleteTagResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to delete tag.");
      }

      const nextCustomTags = customTags.filter((tag) => tag.id !== tagId);
      setCustomTags(nextCustomTags);
      if (activeEditTagId === tagId) {
        resetEditState();
      }
      setSuccessMessage(`"${target.name}" was deleted.`);
      await syncInboxTagCatalogCache(nextCustomTags);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete tag.",
      );
    } finally {
      setDeletingTagId(null);
    }
  }

  return (
    <div className="space-y-4">
      {successMessage ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#D8D2FF] bg-[#F3F0FF] px-5 py-3 text-sm font-medium text-[#6d5ed6]">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          <CircleAlert size={16} />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <SettingsSectionCard
        title="Tag management"
        description="Create and manage workspace tags used to label Inbox conversations."
      >
        <div className="grid grid-cols-1 gap-3 border-b border-[#F0F2F6] px-6 py-6 md:grid-cols-3 md:px-8">
          <SummaryMetric
            title="Total tags"
            value={allTags.length}
            subtitle="Preset and custom combined"
          />
          <SummaryMetric
            title="Preset"
            value={PRESET_TAG_ROWS.length}
            subtitle="Default options included by system"
          />
          <SummaryMetric
            title="Custom"
            value={customTags.length}
            subtitle="Custom Tags"
          />
        </div>

        <form
          onSubmit={handleAddCustomTag}
          className="border-b border-[#F0F2F6] px-6 py-6 md:px-8"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#101011]">
            <Tag size={16} className="text-[#8771FF]" />
            Add custom tag
          </h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_170px_minmax(0,1fr)_auto] md:items-end">
            <div>
              <label
                htmlFor="tag-name"
                className="mb-1 block text-xs font-medium text-[#606266]"
              >
                Tag name
              </label>
              <input
                id="tag-name"
                name="tag-name"
                type="text"
                value={tagName}
                maxLength={MAX_TAG_NAME_LENGTH}
                onChange={(event) => setTagName(event.target.value)}
                placeholder="Example: High ticket closer"
                className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF] focus:outline-none focus:ring-0"
              />
            </div>

            <div>
              <label
                htmlFor="tag-category"
                className="mb-1 block text-xs font-medium text-[#606266]"
              >
                Category
              </label>
              <TagCategoryDropdown
                id="tag-category"
                name="tag-category"
                value={tagCategory}
                onChange={setTagCategory}
              />
            </div>

            <div>
              <label
                htmlFor="tag-description"
                className="mb-1 block text-xs font-medium text-[#606266]"
              >
                Description
              </label>
              <input
                id="tag-description"
                name="tag-description"
                type="text"
                value={tagDescription}
                maxLength={MAX_TAG_DESCRIPTION_LENGTH}
                onChange={(event) => setTagDescription(event.target.value)}
                placeholder="Short note for teammates"
                className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF] focus:outline-none focus:ring-0"
              />
            </div>

            <Button
              type="submit"
              className="h-12 w-full md:w-auto"
              disabled={!canAddTag}
              isLoading={isCreating}
              leftIcon={<Plus size={16} />}
            >
              Add Tag
            </Button>
          </div>

          <p className="mt-3 text-xs text-[#606266]">
            Custom tags are available in Inbox tagging.
          </p>
        </form>

        <div className="px-6 py-6 md:px-8">
          <div className="overflow-x-auto rounded-2xl border border-[#F0F2F6]">
            <table className="w-full min-w-[860px] border-collapse bg-white">
              <thead className="bg-[#F8F7FF] text-left">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#606266]">
                    Tag
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#606266]">
                    Category
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#606266]">
                    Source
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#606266]">
                    Description
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
                  <tr
                    key={tagRow.id}
                    className="border-t border-[#F0F2F6] align-top"
                  >
                    <td className="px-4 py-3">
                      {activeEditTagId === tagRow.id ? (
                        <input
                          type="text"
                          value={editTagName}
                          maxLength={MAX_TAG_NAME_LENGTH}
                          onChange={(event) =>
                            setEditTagName(event.target.value)
                          }
                          className="h-10 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF] focus:outline-none focus:ring-0"
                        />
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#F0F2F6] bg-[#F8F7FF] px-3 py-1.5">
                          <Tag size={12} className="text-[#8771FF]" />
                          <span className="text-sm font-medium text-[#101011]">
                            {tagRow.name}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {activeEditTagId === tagRow.id ? (
                        <TagCategoryDropdown
                          id={`edit-tag-category-${tagRow.id}`}
                          value={editTagCategory}
                          onChange={setEditTagCategory}
                        />
                      ) : (
                        <CategoryBadge category={tagRow.category} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SourceBadge source={tagRow.source} />
                    </td>
                    <td className="max-w-[300px] px-4 py-3 text-sm text-[#606266]">
                      {activeEditTagId === tagRow.id ? (
                        <input
                          type="text"
                          value={editTagDescription}
                          maxLength={MAX_TAG_DESCRIPTION_LENGTH}
                          onChange={(event) =>
                            setEditTagDescription(event.target.value)
                          }
                          className="h-10 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF] focus:outline-none focus:ring-0"
                        />
                      ) : (
                        tagRow.description
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[#101011]">
                        {tagRow.createdBy}
                      </p>
                      <p className="mt-0.5 text-xs text-[#606266]">
                        {tagRow.createdAt}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {tagRow.source === "Preset" ? (
                        <span className="text-xs text-[#9A9CA2]">System</span>
                      ) : activeEditTagId === tagRow.id ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-9 px-3"
                            disabled={isUpdating}
                            isLoading={isUpdating}
                            onClick={handleSaveEditedTag}
                          >
                            Save
                          </Button>
                          <button
                            type="button"
                            className="inline-flex h-9 items-center rounded-lg border border-[#F0F2F6] px-3 text-xs font-medium text-[#606266] transition-colors hover:bg-[#F8F7FF]"
                            onClick={resetEditState}
                            disabled={isUpdating}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <TagRowActionsMenu
                          onEdit={() => beginEditTag(tagRow)}
                          onDelete={() => handleDeleteTag(tagRow.id)}
                          disableEdit={Boolean(deletingTagId) || isUpdating}
                          disableDelete={Boolean(deletingTagId) || isUpdating}
                          deleteLabel={
                            deletingTagId === tagRow.id
                              ? "Deleting..."
                              : "Delete"
                          }
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SettingsSectionCard>
    </div>
  );
}
