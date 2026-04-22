"use client";

import { StatusIcon } from "@/components/icons/StatusIcon";
import TagRowActionsMenu from "@/components/settings/TagRowActionsMenu";
import { Button } from "@/components/ui/Button";
import {
  buildStatusPillStyle,
  normalizeStatusColorHex,
} from "@/lib/status/config";
import {
  MAX_TAG_DESCRIPTION_LENGTH,
  MAX_TAG_NAME_LENGTH,
} from "@/lib/tags/config";
import type { TagRow } from "@/types/tags";
import { DEFAULT_TAG_COLOR_HEX } from "./constants";
import TagsSettingsSourceBadge from "./TagsSettingsSourceBadge";
import type { TagsSettingsEditFormState } from "./types";
import { formatColorInput } from "./utils";

interface TagsTableRowProps {
  tagRow: TagRow;
  editForm: TagsSettingsEditFormState;
}

export default function TagsTableRow({
  tagRow,
  editForm,
}: TagsTableRowProps) {
  const isEditing = editForm.activeTagId === tagRow.id;

  return (
    <tr key={tagRow.id} className="border-t border-[#F0F2F6] align-middle">
      <td className="px-4 py-3 align-middle">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editForm.tagName}
              maxLength={MAX_TAG_NAME_LENGTH}
              onChange={(event) => editForm.onTagNameChange(event.target.value)}
              className="h-10 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF]"
            />
            <button
              type="button"
              onClick={editForm.openIconPicker}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-[#F0F2F6] bg-white px-3 text-[#606266] transition-colors hover:bg-[#F8F7FF]"
              aria-label="Select edit icon"
            >
              <StatusIcon
                iconPack={editForm.tagIconPack}
                iconName={editForm.tagIconName}
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
          <TagsSettingsSourceBadge source={tagRow.source} />
        </div>
      </td>
      <td className="max-w-[320px] px-4 py-3 text-sm text-[#606266]">
        {isEditing ? (
          <input
            type="text"
            value={editForm.tagDescription}
            maxLength={MAX_TAG_DESCRIPTION_LENGTH}
            onChange={(event) =>
              editForm.onTagDescriptionChange(event.target.value)
            }
            className="h-10 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF]"
          />
        ) : (
          tagRow.description
        )}
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <div className="flex h-10 items-center gap-2 rounded-xl border border-[#F0F2F6] bg-white px-2.5">
            <input
              type="color"
              value={formatColorInput(editForm.tagColorHex)}
              onChange={(event) =>
                editForm.onTagColorHexChange(event.target.value)
              }
              className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0"
            />
            <span className="text-xs font-semibold text-[#606266]">
              {normalizeStatusColorHex(editForm.tagColorHex) ||
                DEFAULT_TAG_COLOR_HEX}
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
        <p className="text-sm font-medium text-[#101011]">{tagRow.createdBy}</p>
        <p className="mt-0.5 text-xs text-[#606266]">{tagRow.createdAt}</p>
      </td>
      <td className="px-4 py-3">
        {tagRow.source === "Default" ? (
          <span className="text-xs text-[#9A9CA2]">System</span>
        ) : isEditing ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 px-3"
              disabled={editForm.isSubmitting}
              isLoading={editForm.isSubmitting}
              onClick={editForm.save}
            >
              Save
            </Button>
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-lg border border-[#F0F2F6] px-3 text-xs font-medium text-[#606266] transition-colors hover:bg-[#F8F7FF]"
              onClick={editForm.cancel}
              disabled={editForm.isSubmitting}
            >
              Cancel
            </button>
          </div>
        ) : (
          <TagRowActionsMenu
            onEdit={() => editForm.begin(tagRow)}
            onDelete={() => editForm.remove(tagRow.id)}
            disableEdit={Boolean(editForm.deletingTagId) || editForm.isSubmitting}
            disableDelete={Boolean(editForm.deletingTagId) || editForm.isSubmitting}
            deleteLabel={
              editForm.deletingTagId === tagRow.id ? "Deleting..." : "Delete"
            }
          />
        )}
      </td>
    </tr>
  );
}