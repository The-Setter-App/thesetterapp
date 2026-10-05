"use client";

import { Pencil, Trash2 } from "lucide-react";
import {
  SETTINGS_BLOCK_CLASS,
  SETTINGS_ICON_BUTTON_CLASS,
  SETTINGS_PRIMARY_BUTTON_CLASS,
  SETTINGS_SECONDARY_BUTTON_CLASS,
} from "@/components/settings/settingsStyles";
import { STATUS_ROLE_LABELS } from "@/lib/tags/config";
import type { TagRow } from "@/types/tags";
import { EMPTY_TAG_DESCRIPTION } from "./constants";
import StatusPill from "./StatusPill";
import TagFields from "./TagFields";
import type { TagsSettingsEditFormState } from "./types";

interface TagsListRowProps {
  tagRow: TagRow;
  editForm: TagsSettingsEditFormState;
}

export default function TagsListRow({ tagRow, editForm }: TagsListRowProps) {
  const isEditing = editForm.activeTagId === tagRow.id;
  const isDeleting = editForm.deletingTagId === tagRow.id;
  const isBusy = Boolean(editForm.deletingTagId) || editForm.isSubmitting;
  const hasDescription =
    tagRow.description.length > 0 &&
    tagRow.description !== EMPTY_TAG_DESCRIPTION;

  if (isEditing) {
    return (
      <li className={`${SETTINGS_BLOCK_CLASS} space-y-4 bg-[#F8F7FF]`}>
        <TagFields idPrefix={`status-${tagRow.id}`} fields={editForm} />
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={editForm.cancel}
            disabled={editForm.isSubmitting}
            className={`${SETTINGS_SECONDARY_BUTTON_CLASS} w-full !bg-white md:w-auto`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={editForm.save}
            disabled={editForm.isSubmitting}
            className={`${SETTINGS_PRIMARY_BUTTON_CLASS} w-full md:w-auto`}
          >
            {editForm.isSubmitting ? "Saving…" : "Save"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      className={`${SETTINGS_BLOCK_CLASS} flex items-center justify-between gap-3 !py-3.5 transition-opacity duration-150 ${
        isDeleting ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill
            name={tagRow.name}
            colorHex={tagRow.colorHex}
            iconPack={tagRow.iconPack}
            iconName={tagRow.iconName}
          />
          {tagRow.role ? (
            <span className="inline-flex h-6 items-center rounded-full bg-[#F4F5F8] px-2.5 text-xs font-medium text-[#606266]">
              {STATUS_ROLE_LABELS[tagRow.role]}
            </span>
          ) : null}
        </div>
        <p
          className={`mt-1.5 line-clamp-2 text-sm leading-snug ${
            hasDescription ? "text-[#606266]" : "text-[#9A9CA2]"
          }`}
        >
          {hasDescription ? tagRow.description : "No description yet"}
        </p>
      </div>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => editForm.begin(tagRow)}
          disabled={isBusy}
          aria-label={`Edit ${tagRow.name}`}
          title="Edit"
          className={`${SETTINGS_ICON_BUTTON_CLASS} [@media(hover:hover)]:enabled:hover:bg-[#F4F5F8] [@media(hover:hover)]:enabled:hover:text-[#101011]`}
        >
          <Pencil size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => editForm.remove(tagRow.id)}
          // A status that holds a role is in use by the dashboard.
          disabled={isBusy || Boolean(tagRow.role)}
          aria-label={`Delete ${tagRow.name}`}
          title={
            tagRow.role ? "Move its role to another status first" : "Delete"
          }
          className={`${SETTINGS_ICON_BUTTON_CLASS} disabled:opacity-30 [@media(hover:hover)]:enabled:hover:bg-red-50 [@media(hover:hover)]:enabled:hover:text-red-600`}
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
