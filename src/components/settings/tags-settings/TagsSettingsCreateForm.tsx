"use client";

import { Plus } from "lucide-react";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { Button } from "@/components/ui/Button";
import { normalizeStatusColorHex } from "@/lib/status/config";
import {
  MAX_TAG_DESCRIPTION_LENGTH,
  MAX_TAG_NAME_LENGTH,
  STATUS_ROLE_OPTIONS,
} from "@/lib/tags/config";
import type { StatusRole } from "@/types/tags";
import { DEFAULT_TAG_COLOR_HEX } from "./constants";
import type { TagsSettingsCreateFormState } from "./types";
import { formatColorInput } from "./utils";

interface TagsSettingsCreateFormProps {
  createForm: TagsSettingsCreateFormState;
}

export default function TagsSettingsCreateForm({
  createForm,
}: TagsSettingsCreateFormProps) {
  return (
    <form
      onSubmit={createForm.onSubmit}
      className="border-b border-[#F0F2F6] px-6 py-6 md:px-8"
    >
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#101011]">
        <StatusIcon
          iconPack={createForm.tagIconPack}
          iconName={createForm.tagIconName}
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
            value={createForm.tagName}
            maxLength={MAX_TAG_NAME_LENGTH}
            onChange={(event) => createForm.onTagNameChange(event.target.value)}
            placeholder="Example: Revisit next month"
            className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF]"
          />
        </div>

        <div>
          <label
            htmlFor="tag-description"
            className="mb-1 block text-xs font-medium text-[#606266]"
          >
            Description (also used as AI matching criteria)
          </label>
          <input
            id="tag-description"
            name="tag-description"
            type="text"
            value={createForm.tagDescription}
            maxLength={MAX_TAG_DESCRIPTION_LENGTH}
            onChange={(event) =>
              createForm.onTagDescriptionChange(event.target.value)
            }
            placeholder="e.g. Lead mentions a budget over $2000"
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
              value={formatColorInput(createForm.tagColorHex)}
              onChange={(event) =>
                createForm.onTagColorHexChange(event.target.value)
              }
              className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0"
            />
            <span className="text-xs font-semibold text-[#606266]">
              {normalizeStatusColorHex(createForm.tagColorHex) ||
                DEFAULT_TAG_COLOR_HEX}
            </span>
          </div>
        </div>

        <div>
          <p className="mb-1 block text-xs font-medium text-[#606266]">Icon</p>
          <button
            type="button"
            onClick={createForm.openIconPicker}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#F0F2F6] bg-white text-sm font-medium text-[#101011] transition-colors hover:bg-[#F8F7FF]"
            aria-label="Select icon"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#F0F2F6] bg-[#F8F7FF]">
              <StatusIcon
                iconPack={createForm.tagIconPack}
                iconName={createForm.tagIconName}
                className="h-4 w-4"
              />
            </span>
          </button>
        </div>

        <Button
          type="submit"
          className="h-12 w-full md:w-auto"
          disabled={!createForm.canSubmit}
          isLoading={createForm.isSubmitting}
          leftIcon={<Plus size={16} />}
        >
          Add Status
        </Button>
      </div>

      <div className="mt-3 max-w-xs">
        <label
          htmlFor="tag-role"
          className="mb-1 block text-xs font-medium text-[#606266]"
        >
          Special role (optional)
        </label>
        <select
          id="tag-role"
          value={createForm.tagRole ?? ""}
          onChange={(event) =>
            createForm.onTagRoleChange(
              (event.target.value || null) as StatusRole | null,
            )
          }
          className="h-10 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors hover:bg-[#F8F7FF]"
        >
          <option value="">None</option>
          {STATUS_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[#9B9DA5]">
          Only one status can hold a role at a time — assigning it here moves it
          off whichever status has it now.
        </p>
      </div>

      <p className="mt-3 text-xs text-[#606266]">
        Custom statuses are available in Inbox status dropdowns and filters. AI
        checks new messages against every status's description and moves the
        conversation automatically when one clearly matches — you can always
        change it manually too.
      </p>
    </form>
  );
}
