import { randomUUID } from "node:crypto";
import {
  isTagIconPack,
  normalizeStatusColorHex,
  normalizeStatusKey,
} from "@/lib/status/config";
import {
  hasDuplicateTagName,
  MAX_TAG_DESCRIPTION_LENGTH,
  MAX_TAG_NAME_LENGTH,
  normalizeTagText,
  PRESET_TAG_ROWS,
} from "@/lib/tags/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkspaceTagRowDb } from "@/lib/supabase/types";
import type { TagRow, TagIconPack } from "@/types/tags";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeTagId(value: string): string {
  return value.trim();
}

function formatTimestamp(value: Date): string {
  return value.toLocaleString([], {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isIconNameValid(iconName: string): boolean {
  return /^[A-Za-z][A-Za-z0-9]+$/.test(iconName.trim());
}

function mapTagRow(row: WorkspaceTagRowDb): TagRow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    source: "Custom",
    colorHex: row.color_hex,
    iconPack: row.icon_pack,
    iconName: row.icon_name,
    createdBy: row.created_by_label,
    createdAt: formatTimestamp(new Date(row.created_at)),
  };
}

export class WorkspaceTagRepositoryError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function validateTagPayload(input: {
  name: string;
  description: string;
  colorHex: string;
  iconPack: TagIconPack;
  iconName: string;
}) {
  const normalizedName = normalizeTagText(input.name);
  if (!normalizedName) {
    throw new WorkspaceTagRepositoryError(
      "invalid_name",
      "Status tag name is required.",
      400,
    );
  }

  if (normalizedName.length > MAX_TAG_NAME_LENGTH) {
    throw new WorkspaceTagRepositoryError(
      "invalid_name_length",
      `Status tag name must be ${MAX_TAG_NAME_LENGTH} characters or fewer.`,
      400,
    );
  }

  const normalizedDescription = normalizeTagText(input.description);
  if (normalizedDescription.length > MAX_TAG_DESCRIPTION_LENGTH) {
    throw new WorkspaceTagRepositoryError(
      "invalid_description_length",
      `Description must be ${MAX_TAG_DESCRIPTION_LENGTH} characters or fewer.`,
      400,
    );
  }

  const normalizedColorHex = normalizeStatusColorHex(input.colorHex);
  if (!normalizedColorHex) {
    throw new WorkspaceTagRepositoryError(
      "invalid_color_hex",
      "A valid color is required (hex format, e.g. #8771FF).",
      400,
    );
  }

  if (!isTagIconPack(input.iconPack)) {
    throw new WorkspaceTagRepositoryError(
      "invalid_icon_pack",
      "Invalid icon pack selection.",
      400,
    );
  }

  const normalizedIconName = input.iconName.trim();
  if (!isIconNameValid(normalizedIconName)) {
    throw new WorkspaceTagRepositoryError(
      "invalid_icon_name",
      "A valid icon is required.",
      400,
    );
  }

  if (hasDuplicateTagName(normalizedName, PRESET_TAG_ROWS)) {
    throw new WorkspaceTagRepositoryError(
      "reserved_name",
      "Status name already exists in default statuses.",
      409,
    );
  }

  return {
    normalizedName,
    normalizedDescription,
    normalizedColorHex,
    normalizedIconName,
  };
}

export async function listWorkspaceCustomTags(
  workspaceOwnerEmail: string,
): Promise<TagRow[]> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(workspaceOwnerEmail);
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("workspace_status_tags")
    .select(
      "id,workspace_owner_email,normalized_name,name,description,source,color_hex,icon_pack,icon_name,created_by_email,created_by_label,created_at,updated_at",
    )
    .eq("workspace_owner_email", normalizedWorkspaceOwnerEmail)
    .order("created_at", { ascending: false });

  if (error) {
    throw new WorkspaceTagRepositoryError(
      "list_failed",
      "Failed to load custom status tags.",
      500,
    );
  }

  return ((data ?? []) as WorkspaceTagRowDb[]).map(mapTagRow);
}

export async function listWorkspaceAssignableTags(
  workspaceOwnerEmail: string,
): Promise<TagRow[]> {
  const customTags = await listWorkspaceCustomTags(workspaceOwnerEmail);
  return [...PRESET_TAG_ROWS, ...customTags];
}

export async function listWorkspaceStatusNames(
  workspaceOwnerEmail: string,
): Promise<string[]> {
  const tags = await listWorkspaceAssignableTags(workspaceOwnerEmail);
  return tags.map((tag) => tag.name);
}

export async function createWorkspaceCustomTag(input: {
  workspaceOwnerEmail: string;
  name: string;
  description: string;
  colorHex: string;
  iconPack: TagIconPack;
  iconName: string;
  createdByEmail: string;
  createdByLabel?: string;
}): Promise<TagRow> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(input.workspaceOwnerEmail);
  const normalizedCreatedByEmail = normalizeEmail(input.createdByEmail);
  const normalizedCreatedByLabel = normalizeTagText(input.createdByLabel || "");
  const {
    normalizedName,
    normalizedDescription,
    normalizedColorHex,
    normalizedIconName,
  } = validateTagPayload({
    name: input.name,
    description: input.description,
    colorHex: input.colorHex,
    iconPack: input.iconPack,
    iconName: input.iconName,
  });

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const insertPayload = {
    id: randomUUID(),
    workspace_owner_email: normalizedWorkspaceOwnerEmail,
    normalized_name: normalizeStatusKey(normalizedName),
    name: normalizedName,
    description: normalizedDescription || "No description added",
    source: "Custom" as const,
    color_hex: normalizedColorHex,
    icon_pack: input.iconPack,
    icon_name: normalizedIconName,
    created_by_email: normalizedCreatedByEmail,
    created_by_label: normalizedCreatedByLabel || normalizedCreatedByEmail,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("workspace_status_tags")
    .insert(insertPayload)
    .select(
      "id,workspace_owner_email,normalized_name,name,description,source,color_hex,icon_pack,icon_name,created_by_email,created_by_label,created_at,updated_at",
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new WorkspaceTagRepositoryError(
        "duplicate_tag",
        "Status name already exists.",
        409,
      );
    }
    throw new WorkspaceTagRepositoryError(
      "create_failed",
      "Failed to create status tag.",
      500,
    );
  }

  return mapTagRow(data as WorkspaceTagRowDb);
}

export async function updateWorkspaceCustomTag(input: {
  workspaceOwnerEmail: string;
  tagId: string;
  name: string;
  description: string;
  colorHex: string;
  iconPack: TagIconPack;
  iconName: string;
}): Promise<TagRow> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(input.workspaceOwnerEmail);
  const normalizedTagId = normalizeTagId(input.tagId);
  if (!normalizedTagId) {
    throw new WorkspaceTagRepositoryError(
      "invalid_tag_id",
      "Invalid status tag id.",
      400,
    );
  }

  const {
    normalizedName,
    normalizedDescription,
    normalizedColorHex,
    normalizedIconName,
  } = validateTagPayload({
    name: input.name,
    description: input.description,
    colorHex: input.colorHex,
    iconPack: input.iconPack,
    iconName: input.iconName,
  });

  const supabase = getSupabaseServerClient();
  const { data: existingTag } = await supabase
    .from("workspace_status_tags")
    .select("id")
    .eq("workspace_owner_email", normalizedWorkspaceOwnerEmail)
    .eq("id", normalizedTagId)
    .maybeSingle();

  if (!existingTag) {
    throw new WorkspaceTagRepositoryError(
      "tag_not_found",
      "Status tag not found.",
      404,
    );
  }

  const { data, error } = await supabase
    .from("workspace_status_tags")
    .update({
      normalized_name: normalizeStatusKey(normalizedName),
      name: normalizedName,
      description: normalizedDescription || "No description added",
      color_hex: normalizedColorHex,
      icon_pack: input.iconPack,
      icon_name: normalizedIconName,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_owner_email", normalizedWorkspaceOwnerEmail)
    .eq("id", normalizedTagId)
    .select(
      "id,workspace_owner_email,normalized_name,name,description,source,color_hex,icon_pack,icon_name,created_by_email,created_by_label,created_at,updated_at",
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new WorkspaceTagRepositoryError(
        "duplicate_tag",
        "Status name already exists.",
        409,
      );
    }
    throw new WorkspaceTagRepositoryError(
      "update_failed",
      "Failed to update status tag.",
      500,
    );
  }

  return mapTagRow(data as WorkspaceTagRowDb);
}

export async function deleteWorkspaceCustomTag(input: {
  workspaceOwnerEmail: string;
  tagId: string;
}): Promise<void> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(input.workspaceOwnerEmail);
  const normalizedTagId = normalizeTagId(input.tagId);
  if (!normalizedTagId) {
    throw new WorkspaceTagRepositoryError(
      "invalid_tag_id",
      "Invalid status tag id.",
      400,
    );
  }

  const supabase = getSupabaseServerClient();

  const { data: existing } = await supabase
    .from("workspace_status_tags")
    .select("id,name")
    .eq("workspace_owner_email", normalizedWorkspaceOwnerEmail)
    .eq("id", normalizedTagId)
    .maybeSingle();

  if (!existing) {
    throw new WorkspaceTagRepositoryError(
      "tag_not_found",
      "Status tag not found.",
      404,
    );
  }

  const { count: usageCount, error: usageError } = await supabase
    .from("inbox_conversations")
    .select("id", { count: "exact", head: true })
    .eq("owner_email", normalizedWorkspaceOwnerEmail)
    .eq("status", existing.name);

  if (usageError) {
    throw new WorkspaceTagRepositoryError(
      "usage_check_failed",
      "Failed to verify status usage.",
      500,
    );
  }

  if ((usageCount ?? 0) > 0) {
    throw new WorkspaceTagRepositoryError(
      "status_in_use",
      "This status is in use and cannot be deleted.",
      409,
    );
  }

  const { error, count } = await supabase
    .from("workspace_status_tags")
    .delete({ count: "exact" })
    .eq("workspace_owner_email", normalizedWorkspaceOwnerEmail)
    .eq("id", normalizedTagId);

  if (error) {
    throw new WorkspaceTagRepositoryError(
      "delete_failed",
      "Failed to delete status tag.",
      500,
    );
  }

  if (!count) {
    throw new WorkspaceTagRepositoryError(
      "tag_not_found",
      "Status tag not found.",
      404,
    );
  }
}
