import {
  DEFAULT_STATUS_TAGS,
  MAX_STATUS_COLOR_HEX_LENGTH,
  MAX_STATUS_DESCRIPTION_LENGTH,
  MAX_STATUS_NAME_LENGTH,
  normalizeStatusText,
} from "@/lib/status/config";
import type { TagRow } from "@/types/tags";

export const MAX_TAG_NAME_LENGTH = MAX_STATUS_NAME_LENGTH;
export const MAX_TAG_DESCRIPTION_LENGTH = MAX_STATUS_DESCRIPTION_LENGTH;
export const MAX_TAG_COLOR_HEX_LENGTH = MAX_STATUS_COLOR_HEX_LENGTH;

export const PRESET_TAG_ROWS: TagRow[] = DEFAULT_STATUS_TAGS;

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
