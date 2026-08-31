import {
  DEFAULT_STATUS_TAGS,
  MAX_STATUS_COLOR_HEX_LENGTH,
  MAX_STATUS_DESCRIPTION_LENGTH,
  MAX_STATUS_NAME_LENGTH,
  normalizeStatusText,
} from "@/lib/status/config";
import type { StatusRole, TagRow } from "@/types/tags";

export const MAX_TAG_NAME_LENGTH = MAX_STATUS_NAME_LENGTH;
export const MAX_TAG_DESCRIPTION_LENGTH = MAX_STATUS_DESCRIPTION_LENGTH;
export const MAX_TAG_COLOR_HEX_LENGTH = MAX_STATUS_COLOR_HEX_LENGTH;

export const PRESET_TAG_ROWS: TagRow[] = DEFAULT_STATUS_TAGS;

// Order matters here - shown top-to-bottom in the role picker, roughly
// following the funnel from new lead through to a closed outcome.
export const STATUS_ROLE_OPTIONS: Array<{ value: StatusRole; label: string }> =
  [
    { value: "new", label: "Default for new leads" },
    { value: "in_contact", label: "In contact" },
    { value: "qualified", label: "Qualified" },
    { value: "booked", label: "Booked" },
    { value: "won", label: "Won" },
    { value: "unqualified", label: "Unqualified" },
    { value: "no_show", label: "No-show" },
    { value: "retarget", label: "Retarget" },
  ];

export const STATUS_ROLE_LABELS: Record<StatusRole, string> =
  Object.fromEntries(
    STATUS_ROLE_OPTIONS.map((option) => [option.value, option.label]),
  ) as Record<StatusRole, string>;

export function normalizeTagText(value: string): string {
  return normalizeStatusText(value);
}

export function hasDuplicateTagName(
  tagName: string,
  tags: Array<Pick<TagRow, "name">>,
): boolean {
  const normalizedTagName = normalizeTagText(tagName).toLowerCase();
  return tags.some(
    (tag) => normalizeTagText(tag.name).toLowerCase() === normalizedTagName,
  );
}
