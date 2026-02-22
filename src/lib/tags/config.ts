import type { TagCategory, TagRow } from "@/types/tags";

export const MAX_TAG_NAME_LENGTH = 32;
export const MAX_TAG_DESCRIPTION_LENGTH = 80;

export const TAG_CATEGORY_OPTIONS: Array<{
  value: TagCategory;
  label: string;
}> = [
  { value: "Custom", label: "Custom" },
  { value: "Priority", label: "Priority" },
  { value: "Lead Stage", label: "Lead Stage" },
  { value: "Intent", label: "Intent" },
  { value: "Follow Up", label: "Follow Up" },
];

export const PRESET_TAG_ROWS: TagRow[] = [
  {
    id: "preset-hot-lead",
    name: "Hot Lead",
    category: "Priority",
    description: "Conversation needs same-day response",
    source: "Preset",
    inboxStatus: "Not wired yet",
    createdBy: "System",
    createdAt: "Default",
  },
  {
    id: "preset-qualified",
    name: "Qualified",
    category: "Lead Stage",
    description: "Lead meets offer criteria",
    source: "Preset",
    inboxStatus: "Not wired yet",
    createdBy: "System",
    createdAt: "Default",
  },
  {
    id: "preset-booked-call",
    name: "Booked Call",
    category: "Lead Stage",
    description: "Lead booked on calendar",
    source: "Preset",
    inboxStatus: "Not wired yet",
    createdBy: "System",
    createdAt: "Default",
  },
  {
    id: "preset-follow-up",
    name: "Needs Follow Up",
    category: "Follow Up",
    description: "Lead requested another follow-up touch point",
    source: "Preset",
    inboxStatus: "Not wired yet",
    createdBy: "System",
    createdAt: "Default",
  },
  {
    id: "preset-payment-intent",
    name: "Payment Intent",
    category: "Intent",
    description: "Lead asked about payment methods or plans",
    source: "Preset",
    inboxStatus: "Not wired yet",
    createdBy: "System",
    createdAt: "Default",
  },
];

export function normalizeTagText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isTagCategory(value: unknown): value is TagCategory {
  return TAG_CATEGORY_OPTIONS.some((option) => option.value === value);
}

export function hasDuplicateTagName(
  tagName: string,
  tags: Array<Pick<TagRow, "name">>,
): boolean {
  const normalizedTagName = normalizeTagText(tagName).toLowerCase();
  return tags.some((tag) => tag.name.toLowerCase() === normalizedTagName);
}
