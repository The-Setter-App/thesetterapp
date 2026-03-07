import { normalizeStatusColorHex } from "@/lib/status/config";
import { DEFAULT_TAG_COLOR_HEX, EMPTY_TAG_DESCRIPTION } from "./constants";

export function formatColorInput(colorHex: string): string {
  const normalized = normalizeStatusColorHex(colorHex);
  return normalized || DEFAULT_TAG_COLOR_HEX;
}

export function toEditableTagDescription(description: string): string {
  return description === EMPTY_TAG_DESCRIPTION ? "" : description;
}