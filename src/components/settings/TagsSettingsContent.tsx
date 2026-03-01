"use client";

import { CheckCircle2, CircleAlert, Plus } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { StatusIcon } from "@/components/icons/StatusIcon";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import StatusIconPickerModal from "@/components/settings/StatusIconPickerModal";
import TagRowActionsMenu from "@/components/settings/TagRowActionsMenu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { setCachedInboxTags } from "@/lib/cache";
import { broadcastInboxStatusCatalogChanged } from "@/lib/inbox/clientStatusCatalogSync";
import {
  buildStatusPillStyle,
  normalizeStatusColorHex,
  normalizeStatusText,
} from "@/lib/status/config";
import {
  hasDuplicateTagName,
  MAX_TAG_DESCRIPTION_LENGTH,
  MAX_TAG_NAME_LENGTH,
  normalizeTagText,
  PRESET_TAG_ROWS,
} from "@/lib/tags/config";
import type { TagIconPack, TagRow } from "@/types/tags";

interface TagsSettingsContentProps {
  currentUser: {
    email: string;
    displayName?: string;
  };
  initialTags: TagRow[];
}

interface UpsertTagResponse {
  tag?: TagRow;
  error?: string;
}

interface DeleteTagResponse {
  success?: boolean;
  error?: string;
}

type IconPickerContext = "create" | "edit";

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

function SourceBadge({ source }: { source: TagRow["source"] }) {
  return source === "Default" ? (
    <Badge
      variant="secondary"
      className="bg-[rgba(135,113,255,0.1)] text-[#8771FF]"
    >
      Default
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

function formatColorInput(colorHex: string): string {
  const normalized = normalizeStatusColorHex(colorHex);
  return normalized || "#8771FF";
}

export default function TagsSettingsContent({
  currentUser,
  initialTags,
}: TagsSettingsContentProps) {
  const initialCustomTags = useMemo(
    () => initialTags.filter((tag) => tag.source === "Custom"),
    [initialTags],
  );

  const [customTags, setCustomTags] = useState<TagRow[]>(initialCustomTags);
  const [tagName, setTagName] = useState("");
  const [tagDescription, setTagDescription] = useState("");
  const [tagColorHex, setTagColorHex] = useState("#8771FF");
  const [tagIconPack, setTagIconPack] = useState<TagIconPack>("lu");
  const [tagIconName, setTagIconName] = useState("LuTag");
  const [iconPickerContext, setIconPickerContext] =
    useState<IconPickerContext | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [activeEditTagId, setActiveEditTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagDescription, setEditTagDescription] = useState("");
  const [editTagColorHex, setEditTagColorHex] = useState("#8771FF");
  const [editTagIconPack, setEditTagIconPack] = useState<TagIconPack>("lu");
  const [editTagIconName, setEditTagIconName] = useState("LuTag");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  const allTags = useMemo(
    () => [...PRESET_TAG_ROWS, ...customTags],
    [customTags],
  );
  const normalizedTagName = normalizeTagText(tagName);
  const normalizedTagDescription = normalizeTagText(tagDescription);
  const canAddTag = normalizedTagName.length > 0 && !isCreating && !isUpdating;

  async function syncStatusCatalogCache(nextCustomTags: TagRow[]) {
    const nextAssignableStatuses = [...PRESET_TAG_ROWS, ...nextCustomTags];
    await setCachedInboxTags(nextAssignableStatuses);
    broadcastInboxStatusCatalogChanged(nextAssignableStatuses);
  }

  function resetEditState() {
    setActiveEditTagId(null);
    setEditTagName("");
    setEditTagDescription("");
    setEditTagColorHex("#8771FF");
    setEditTagIconPack("lu");
    setEditTagIconName("LuTag");
  }

  function beginEditTag(tag: TagRow) {
    if (tag.source !== "Custom") return;
    setErrorMessage("");
    setSuccessMessage("");
    setActiveEditTagId(tag.id);
    setEditTagName(tag.name);
    setEditTagDescription(
      tag.description === "No description added" ? "" : tag.description,
    );
    setEditTagColorHex(tag.colorHex);
    setEditTagIconPack(tag.iconPack);
    setEditTagIconName(tag.iconName);
  }

  async function handleAddCustomTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!normalizedTagName) {
      setErrorMessage("Status name is required.");
      return;
    }

    if (normalizedTagName.length > MAX_TAG_NAME_LENGTH) {
      setErrorMessage(
        `Status name must be ${MAX_TAG_NAME_LENGTH} characters or fewer.`,
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
      setErrorMessage("Status name already exists. Use a different name.");
      return;
    }

    const normalizedColor = normalizeStatusColorHex(tagColorHex);
    if (!normalizedColor) {
      setErrorMessage("A valid color is required.");
      return;
    }

    if (!tagIconName.trim()) {
      setErrorMessage("An icon is required.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/settings/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizeStatusText(normalizedTagName),
          description: normalizedTagDescription,
          colorHex: normalizedColor,
          iconPack: tagIconPack,
          iconName: tagIconName,
        }),
      });
      const payload = (await response.json()) as UpsertTagResponse;
      if (!response.ok || !payload.tag) {
        throw new Error(payload.error || "Failed to create status tag.");
      }

      const nextCustomTags = [payload.tag as TagRow, ...customTags];
      setCustomTags(nextCustomTags);
      setTagName("");
      setTagDescription("");
      setTagColorHex("#8771FF");
      setTagIconPack("lu");
      setTagIconName("LuTag");
      setSuccessMessage(
        `"${payload.tag.name}" was saved by ${
          currentUser.displayName || currentUser.email
        }.`,
      );
      await syncStatusCatalogCache(nextCustomTags);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create status tag.",
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
    const normalizedEditDescription = normalizeTagText(editTagDescription);
    const normalizedEditColor = normalizeStatusColorHex(editTagColorHex);

    if (!normalizedEditTagName) {
      setErrorMessage("Status name is required.");
      return;
    }
    if (normalizedEditTagName.length > MAX_TAG_NAME_LENGTH) {
      setErrorMessage(
        `Status name must be ${MAX_TAG_NAME_LENGTH} characters or fewer.`,
      );
      return;
    }
    if (normalizedEditDescription.length > MAX_TAG_DESCRIPTION_LENGTH) {
      setErrorMessage(
        `Description must be ${MAX_TAG_DESCRIPTION_LENGTH} characters or fewer.`,
      );
      return;
    }
    if (!normalizedEditColor) {
      setErrorMessage("A valid color is required.");
      return;
    }
    if (!editTagIconName.trim()) {
      setErrorMessage("An icon is required.");
      return;
    }

    const existingRowsExcludingCurrent = allTags.filter(
      (tag) => tag.id !== activeEditTagId,
    );
    if (
      hasDuplicateTagName(normalizedEditTagName, existingRowsExcludingCurrent)
    ) {
      setErrorMessage("Status name already exists. Use a different name.");
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
            name: normalizeStatusText(normalizedEditTagName),
            description: normalizedEditDescription,
            colorHex: normalizedEditColor,
            iconPack: editTagIconPack,
            iconName: editTagIconName,
          }),
        },
      );
      const payload = (await response.json()) as UpsertTagResponse;
      if (!response.ok || !payload.tag) {
        throw new Error(payload.error || "Failed to update status tag.");
      }

      const nextCustomTags = customTags.map((row) =>
        row.id === activeEditTagId ? (payload.tag as TagRow) : row,
      );
      setCustomTags(nextCustomTags);
      setSuccessMessage(`"${payload.tag.name}" was updated.`);
      resetEditState();
      await syncStatusCatalogCache(nextCustomTags);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update status tag.",
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
        throw new Error(payload.error || "Failed to delete status tag.");
      }

      const nextCustomTags = customTags.filter((tag) => tag.id !== tagId);
      setCustomTags(nextCustomTags);
      if (activeEditTagId === tagId) {
        resetEditState();
      }
      setSuccessMessage(`"${target.name}" was deleted.`);
      await syncStatusCatalogCache(nextCustomTags);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete status tag.",
      );
    } finally {
      setDeletingTagId(null);
    }
  }

  function handleIconSelect(selection: {
    iconPack: TagIconPack;
    iconName: string;
  }) {
    if (iconPickerContext === "edit") {
      setEditTagIconPack(selection.iconPack);
      setEditTagIconName(selection.iconName);
    } else {
      setTagIconPack(selection.iconPack);
      setTagIconName(selection.iconName);
    }
    setIconPickerContext(null);
  }

  return (
    <div className="space-y-4">
      <StatusIconPickerModal
        open={iconPickerContext !== null}
        selectedIconPack={
          iconPickerContext === "edit" ? editTagIconPack : tagIconPack
        }
        selectedIconName={
          iconPickerContext === "edit" ? editTagIconName : tagIconName
        }
        onClose={() => setIconPickerContext(null)}
        onSelect={handleIconSelect}
      />

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
        title="Status tags"
        description="Manage default and custom statuses used in Inbox and Leads."
      >
        <div className="grid grid-cols-1 gap-3 border-b border-[#F0F2F6] px-6 py-6 md:grid-cols-3 md:px-8">
          <SummaryMetric
            title="Total statuses"
            value={allTags.length}
            subtitle="Default and custom combined"
          />
          <SummaryMetric
            title="Default"
            value={PRESET_TAG_ROWS.length}
            subtitle="Built-in statuses"
          />
          <SummaryMetric
            title="Custom"
            value={customTags.length}
            subtitle="Workspace custom statuses"
          />
        </div>

        <form
          onSubmit={handleAddCustomTag}
          className="border-b border-[#F0F2F6] px-6 py-6 md:px-8"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#101011]">
            <StatusIcon
              iconPack={tagIconPack}
              iconName={tagIconName}
              className="h-4 w-4 text-[#8771FF]"
            />
            Add custom status
          </h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_150px_auto] md:items-end">
            <div>
              <label
                htmlFor="tag-name"
                className="mb-1 block text-xs font-medium text-[#606266]"
              >
                Status name
              </label>
              <input
                id="tag-name"
                name="tag-name"
                type="text"
                value={tagName}
                maxLength={MAX_TAG_NAME_LENGTH}
                onChange={(event) => setTagName(event.target.value)}
                placeholder="Example: Revisit next month"
                className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF]"
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
                className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF]"
              />
            </div>

            <div>
              <label
                htmlFor="tag-color"
                className="mb-1 block text-xs font-medium text-[#606266]"
              >
                Color
              </label>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-[#F0F2F6] bg-white px-2.5">
                <input
                  id="tag-color"
                  name="tag-color"
                  type="color"
                  value={formatColorInput(tagColorHex)}
                  onChange={(event) => setTagColorHex(event.target.value)}
                  className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0"
                />
                <span className="text-xs font-semibold text-[#606266]">
                  {normalizeStatusColorHex(tagColorHex) || "#8771FF"}
                </span>
              </div>
            </div>

            <div>
              <p className="mb-1 block text-xs font-medium text-[#606266]">
                Icon
              </p>
              <button
                type="button"
                onClick={() => setIconPickerContext("create")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#F0F2F6] bg-white text-sm font-medium text-[#101011] transition-colors hover:bg-[#F8F7FF]"
                aria-label="Select icon"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#F0F2F6] bg-[#F8F7FF]">
                  <StatusIcon
                    iconPack={tagIconPack}
                    iconName={tagIconName}
                    className="h-4 w-4"
                  />
                </span>
              </button>
            </div>

            <Button
              type="submit"
              className="h-12 w-full md:w-auto"
              disabled={!canAddTag}
              isLoading={isCreating}
              leftIcon={<Plus size={16} />}
            >
              Add Status
            </Button>
          </div>

          <p className="mt-3 text-xs text-[#606266]">
            Custom statuses are available in Inbox status dropdowns and filters.
          </p>
        </form>

        <div className="px-6 py-6 md:px-8">
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
                  <tr
                    key={tagRow.id}
                    className="border-t border-[#F0F2F6] align-middle"
                  >
                    <td className="px-4 py-3 align-middle">
                      {activeEditTagId === tagRow.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editTagName}
                            maxLength={MAX_TAG_NAME_LENGTH}
                            onChange={(event) =>
                              setEditTagName(event.target.value)
                            }
                            className="h-10 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF]"
                          />
                          <button
                            type="button"
                            onClick={() => setIconPickerContext("edit")}
                            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-[#F0F2F6] bg-white px-3 text-[#606266] transition-colors hover:bg-[#F8F7FF]"
                            aria-label="Select edit icon"
                          >
                            <StatusIcon
                              iconPack={editTagIconPack}
                              iconName={editTagIconName}
                              className="h-4 w-4"
                            />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold leading-none"
                          style={buildStatusPillStyle(tagRow.colorHex)}
                        >
                          <StatusIcon
                            iconPack={tagRow.iconPack}
                            iconName={tagRow.iconName}
                            className="h-3.5 w-3.5 shrink-0 self-center"
                            style={{ color: tagRow.colorHex }}
                          />
                          <span className="inline-flex items-center leading-none">
                            {tagRow.name}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="inline-flex items-center">
                        <SourceBadge source={tagRow.source} />
                      </div>
                    </td>
                    <td className="max-w-[320px] px-4 py-3 text-sm text-[#606266]">
                      {activeEditTagId === tagRow.id ? (
                        <input
                          type="text"
                          value={editTagDescription}
                          maxLength={MAX_TAG_DESCRIPTION_LENGTH}
                          onChange={(event) =>
                            setEditTagDescription(event.target.value)
                          }
                          className="h-10 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF]"
                        />
                      ) : (
                        tagRow.description
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {activeEditTagId === tagRow.id ? (
                        <div className="flex h-10 items-center gap-2 rounded-xl border border-[#F0F2F6] bg-white px-2.5">
                          <input
                            type="color"
                            value={formatColorInput(editTagColorHex)}
                            onChange={(event) =>
                              setEditTagColorHex(event.target.value)
                            }
                            className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0"
                          />
                          <span className="text-xs font-semibold text-[#606266]">
                            {normalizeStatusColorHex(editTagColorHex) ||
                              "#8771FF"}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <span
                            className="inline-flex h-5 w-5 rounded-full border border-[#E2E5EB]"
                            style={{ backgroundColor: tagRow.colorHex }}
                          />
                          <span className="text-xs font-semibold text-[#606266]">
                            {tagRow.colorHex}
                          </span>
                        </div>
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
                      {tagRow.source === "Default" ? (
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
