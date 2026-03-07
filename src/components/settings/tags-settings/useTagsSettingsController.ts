"use client";

import { type FormEvent, useMemo, useState } from "react";
import { setCachedInboxTags } from "@/lib/cache";
import { broadcastInboxStatusCatalogChanged } from "@/lib/inbox/clientStatusCatalogSync";
import {
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
import {
  DEFAULT_TAG_COLOR_HEX,
  DEFAULT_TAG_ICON_NAME,
  DEFAULT_TAG_ICON_PACK,
} from "./constants";
import type {
  DeleteTagResponse,
  IconPickerContext,
  IconSelection,
  TagsSettingsContentProps,
  UpsertTagResponse,
  UseTagsSettingsControllerResult,
} from "./types";
import { toEditableTagDescription } from "./utils";

export function useTagsSettingsController({
  currentUser,
  initialTags,
}: TagsSettingsContentProps): UseTagsSettingsControllerResult {
  const initialCustomTags = useMemo(
    () => initialTags.filter((tag) => tag.source === "Custom"),
    [initialTags],
  );

  const [customTags, setCustomTags] = useState<TagRow[]>(initialCustomTags);
  const [tagName, setTagName] = useState("");
  const [tagDescription, setTagDescription] = useState("");
  const [tagColorHex, setTagColorHex] = useState(DEFAULT_TAG_COLOR_HEX);
  const [tagIconPack, setTagIconPack] = useState<TagIconPack>(
    DEFAULT_TAG_ICON_PACK,
  );
  const [tagIconName, setTagIconName] = useState(DEFAULT_TAG_ICON_NAME);
  const [iconPickerContext, setIconPickerContext] =
    useState<IconPickerContext | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [activeEditTagId, setActiveEditTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagDescription, setEditTagDescription] = useState("");
  const [editTagColorHex, setEditTagColorHex] =
    useState(DEFAULT_TAG_COLOR_HEX);
  const [editTagIconPack, setEditTagIconPack] = useState<TagIconPack>(
    DEFAULT_TAG_ICON_PACK,
  );
  const [editTagIconName, setEditTagIconName] =
    useState(DEFAULT_TAG_ICON_NAME);
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
    setEditTagColorHex(DEFAULT_TAG_COLOR_HEX);
    setEditTagIconPack(DEFAULT_TAG_ICON_PACK);
    setEditTagIconName(DEFAULT_TAG_ICON_NAME);
  }

  function beginEditTag(tag: TagRow) {
    if (tag.source !== "Custom") return;
    setErrorMessage("");
    setSuccessMessage("");
    setActiveEditTagId(tag.id);
    setEditTagName(tag.name);
    setEditTagDescription(toEditableTagDescription(tag.description));
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

      const nextCustomTags = [payload.tag, ...customTags];
      setCustomTags(nextCustomTags);
      setTagName("");
      setTagDescription("");
      setTagColorHex(DEFAULT_TAG_COLOR_HEX);
      setTagIconPack(DEFAULT_TAG_ICON_PACK);
      setTagIconName(DEFAULT_TAG_ICON_NAME);
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

      const updatedTag = payload.tag;
      const nextCustomTags = customTags.map((row) =>
        row.id === activeEditTagId ? updatedTag : row,
      );
      setCustomTags(nextCustomTags);
      setSuccessMessage(`"${updatedTag.name}" was updated.`);
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

  function handleIconSelect(selection: IconSelection) {
    if (iconPickerContext === "edit") {
      setEditTagIconPack(selection.iconPack);
      setEditTagIconName(selection.iconName);
    } else {
      setTagIconPack(selection.iconPack);
      setTagIconName(selection.iconName);
    }
    setIconPickerContext(null);
  }

  return {
    allTags,
    customTags,
    messages: {
      errorMessage,
      successMessage,
    },
    createForm: {
      tagName,
      tagDescription,
      tagColorHex,
      tagIconPack,
      tagIconName,
      canSubmit: canAddTag,
      isSubmitting: isCreating,
      onSubmit: handleAddCustomTag,
      onTagNameChange: setTagName,
      onTagDescriptionChange: setTagDescription,
      onTagColorHexChange: setTagColorHex,
      openIconPicker: () => setIconPickerContext("create"),
    },
    editForm: {
      activeTagId: activeEditTagId,
      tagName: editTagName,
      tagDescription: editTagDescription,
      tagColorHex: editTagColorHex,
      tagIconPack: editTagIconPack,
      tagIconName: editTagIconName,
      isSubmitting: isUpdating,
      deletingTagId,
      onTagNameChange: setEditTagName,
      onTagDescriptionChange: setEditTagDescription,
      onTagColorHexChange: setEditTagColorHex,
      openIconPicker: () => setIconPickerContext("edit"),
      begin: beginEditTag,
      cancel: resetEditState,
      save: handleSaveEditedTag,
      remove: handleDeleteTag,
    },
    iconPicker: {
      open: iconPickerContext !== null,
      selectedIconPack:
        iconPickerContext === "edit" ? editTagIconPack : tagIconPack,
      selectedIconName:
        iconPickerContext === "edit" ? editTagIconName : tagIconName,
      close: () => setIconPickerContext(null),
      onSelect: handleIconSelect,
    },
  };
}