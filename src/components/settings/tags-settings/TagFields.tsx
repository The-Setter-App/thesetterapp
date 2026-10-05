"use client";

import { ChevronDown } from "lucide-react";
import { StatusIcon } from "@/components/icons/StatusIcon";
import {
  SETTINGS_HINT_CLASS,
  SETTINGS_INPUT_CLASS,
  SETTINGS_LABEL_CLASS,
} from "@/components/settings/settingsStyles";
import {
  MAX_TAG_DESCRIPTION_LENGTH,
  MAX_TAG_NAME_LENGTH,
  STATUS_ROLE_OPTIONS,
} from "@/lib/tags/config";
import type { StatusRole } from "@/types/tags";
import StatusPill from "./StatusPill";
import type { TagFieldsState } from "./types";
import { formatColorInput } from "./utils";

interface TagFieldsProps {
  // Keeps field ids unique when a create and an edit form are both open.
  idPrefix: string;
  fields: TagFieldsState;
}

const APPEARANCE_BUTTON_CLASS =
  "inline-flex h-11 items-center gap-2 rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm font-medium text-[#101011] outline-none transition-[transform,border-color] duration-100 ease-out active:scale-[0.97] focus-within:border-[#8771FF]";

function toStatusRole(value: string): StatusRole | null {
  return (
    STATUS_ROLE_OPTIONS.find((option) => option.value === value)?.value ?? null
  );
}

// The inputs that describe a status: name, role, description, color, icon.
export default function TagFields({ idPrefix, fields }: TagFieldsProps) {
  const colorHex = formatColorInput(fields.tagColorHex);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
        <div>
          <label htmlFor={`${idPrefix}-name`} className={SETTINGS_LABEL_CLASS}>
            Name
          </label>
          <input
            id={`${idPrefix}-name`}
            type="text"
            value={fields.tagName}
            maxLength={MAX_TAG_NAME_LENGTH}
            onChange={(event) => fields.onTagNameChange(event.target.value)}
            placeholder="Revisit next month"
            className={SETTINGS_INPUT_CLASS}
          />
        </div>

        <div>
          <label htmlFor={`${idPrefix}-role`} className={SETTINGS_LABEL_CLASS}>
            Role
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-role`}
              value={fields.tagRole ?? ""}
              onChange={(event) =>
                fields.onTagRoleChange(toStatusRole(event.target.value))
              }
              className={`${SETTINGS_INPUT_CLASS} appearance-none pr-10`}
            >
              <option value="">None</option>
              {STATUS_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9A9CA2]"
            />
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-description`}
          className={SETTINGS_LABEL_CLASS}
        >
          Description
        </label>
        <input
          id={`${idPrefix}-description`}
          type="text"
          value={fields.tagDescription}
          maxLength={MAX_TAG_DESCRIPTION_LENGTH}
          onChange={(event) =>
            fields.onTagDescriptionChange(event.target.value)
          }
          placeholder="Lead mentions a budget over $2,000"
          className={SETTINGS_INPUT_CLASS}
        />
        <p className={SETTINGS_HINT_CLASS}>
          Setter AI reads this to decide when a lead belongs in the status. A
          role tells the dashboard what the status means, and only one status
          can hold each role.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className={`${APPEARANCE_BUTTON_CLASS} cursor-pointer`}>
          <span
            aria-hidden="true"
            className="h-5 w-5 rounded-full border border-black/10"
            style={{ backgroundColor: colorHex }}
          />
          Color
          <input
            type="color"
            value={colorHex}
            onChange={(event) => fields.onTagColorHexChange(event.target.value)}
            className="sr-only"
          />
        </label>

        <button
          type="button"
          onClick={fields.openIconPicker}
          className={APPEARANCE_BUTTON_CLASS}
        >
          <StatusIcon
            iconPack={fields.tagIconPack}
            iconName={fields.tagIconName}
            className="h-4 w-4 text-[#606266]"
          />
          Icon
        </button>

        <span className="ml-auto flex min-w-0 items-center gap-2 text-xs text-[#9A9CA2]">
          Preview
          <StatusPill
            name={fields.tagName.trim() || "Status"}
            colorHex={colorHex}
            iconPack={fields.tagIconPack}
            iconName={fields.tagIconName}
          />
        </span>
      </div>
    </div>
  );
}
