import { randomUUID } from "node:crypto";
import {
  DEFAULT_STATUS_ROLES,
  DEFAULT_STATUS_TAGS,
  isTagIconPack,
  normalizeStatusColorHex,
  normalizeStatusKey,
} from "@/lib/status/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkspaceTagRowDb } from "@/lib/supabase/types";
import {
  MAX_TAG_DESCRIPTION_LENGTH,
  MAX_TAG_NAME_LENGTH,
  normalizeTagText,
} from "@/lib/tags/config";
import type { StatusRole, TagIconPack, TagRow } from "@/types/tags";

const VALID_STATUS_ROLES = new Set<StatusRole>([
  "new",
  "in_contact",
  "qualified",
  "booked",
  "won",
  "unqualified",
  "no_show",
  "retarget",
]);

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

function isValidRole(value: unknown): value is StatusRole {
  return (
    typeof value === "string" && VALID_STATUS_ROLES.has(value as StatusRole)
  );
}

function mapTagRow(row: WorkspaceTagRowDb): TagRow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    source: row.source,
    colorHex: row.color_hex,
    iconPack: row.icon_pack,
    iconName: row.icon_name,
    createdBy: row.created_by_label,
    createdAt: formatTimestamp(new Date(row.created_at)),
    role: isValidRole(row.role) ? row.role : null,
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

  return {
    normalizedName,
    normalizedDescription,
    normalizedColorHex,
    normalizedIconName,
  };
}

/**
 * Seeds the 8 default status tags for a workspace the first time its tags
 * are read, so a brand-new workspace gets the same starting point the old
 * hardcoded presets used to provide - except now they're real, editable,
 * deletable rows from the start. No-op (and race-safe via ON CONFLICT) once
 * a workspace already has any status tags, seeded or custom.
 */
async function ensureWorkspaceStatusTagsSeeded(
  normalizedOwnerEmail: string,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { count } = await supabase
    .from("workspace_status_tags")
    .select("id", { count: "exact", head: true })
    .eq("workspace_owner_email", normalizedOwnerEmail);

  if (count) return;

  const now = new Date().toISOString();
  const rows = DEFAULT_STATUS_TAGS.map((tag) => ({
    id: randomUUID(),
    workspace_owner_email: normalizedOwnerEmail,
    normalized_name: normalizeStatusKey(tag.name),
    name: tag.name,
    description: tag.description,
    source: "Default" as const,
    color_hex: tag.colorHex,
    icon_pack: tag.iconPack,
    icon_name: tag.iconName,
    role: DEFAULT_STATUS_ROLES[tag.name] ?? null,
    created_by_email: normalizedOwnerEmail,
    created_by_label: "System",
    created_at: now,
    updated_at: now,
  }));

  await supabase.from("workspace_status_tags").upsert(rows, {
    onConflict: "workspace_owner_email,normalized_name",
    ignoreDuplicates: true,
  });
}

/** Clears `role` from whichever tag currently holds it, so assigning it elsewhere never conflicts. */
async function clearExistingRoleHolder(
  normalizedOwnerEmail: string,
  role: StatusRole,
  exceptTagId?: string,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("workspace_status_tags")
    .update({ role: null, updated_at: new Date().toISOString() })
    .eq("workspace_owner_email", normalizedOwnerEmail)
    .eq("role", role);

  if (exceptTagId) {
    query = query.neq("id", exceptTagId);
  }

  await query;
}

/**
 * Updates every conversation currently on `oldName` to `newName`, both the
 * status column and the mirrored payload.status field. Renaming a tag
 * without this would silently orphan every conversation using it - they'd
 * keep the old status string with no matching tag row, losing color/icon
 * and falling out of anything that reads status by name.
 */
async function cascadeStatusRename(
  normalizedOwnerEmail: string,
  oldName: string,
  newName: string,
): Promise<void> {
  if (oldName === newName) return;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("inbox_conversations")
    .select("id,payload")
    .eq("owner_email", normalizedOwnerEmail)
    .eq("status", oldName)
    .limit(2000);

  const rows = (data ?? []) as Array<{
    id: string;
    payload: Record<string, unknown>;
  }>;
  if (rows.length === 0) return;

  await Promise.all(
    rows.map((row) =>
      supabase
        .from("inbox_conversations")
        .update({
          status: newName,
          payload: { ...row.payload, status: newName },
        })
        .eq("owner_email", normalizedOwnerEmail)
        .eq("id", row.id),
    ),
  );
}

export async function listWorkspaceAssignableTags(
  workspaceOwnerEmail: string,
): Promise<TagRow[]> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(workspaceOwnerEmail);
  await ensureWorkspaceStatusTagsSeeded(normalizedWorkspaceOwnerEmail);

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_status_tags")
    .select(
      "id,workspace_owner_email,normalized_name,name,description,source,color_hex,icon_pack,icon_name,role,created_by_email,created_by_label,created_at,updated_at",
    )
    .eq("workspace_owner_email", normalizedWorkspaceOwnerEmail)
    .order("created_at", { ascending: true });

  if (error) {
    throw new WorkspaceTagRepositoryError(
      "list_failed",
      "Failed to load status tags.",
      500,
    );
  }

  return ((data ?? []) as WorkspaceTagRowDb[]).map(mapTagRow);
}

export async function listWorkspaceStatusNames(
  workspaceOwnerEmail: string,
): Promise<string[]> {
  const tags = await listWorkspaceAssignableTags(workspaceOwnerEmail);
  return tags.map((tag) => tag.name);
}

/** The tag currently holding a given role for a workspace, if any. */
export async function findWorkspaceTagByRole(
  workspaceOwnerEmail: string,
  role: StatusRole,
): Promise<TagRow | null> {
  const tags = await listWorkspaceAssignableTags(workspaceOwnerEmail);
  return tags.find((tag) => tag.role === role) ?? null;
}

export async function createWorkspaceCustomTag(input: {
  workspaceOwnerEmail: string;
  name: string;
  description: string;
  colorHex: string;
  iconPack: TagIconPack;
  iconName: string;
  role?: StatusRole | null;
  createdByEmail: string;
  createdByLabel?: string;
}): Promise<TagRow> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(
    input.workspaceOwnerEmail,
  );
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

  if (
    input.role !== undefined &&
    input.role !== null &&
    !isValidRole(input.role)
  ) {
    throw new WorkspaceTagRepositoryError(
      "invalid_role",
      "Invalid status role.",
      400,
    );
  }

  await ensureWorkspaceStatusTagsSeeded(normalizedWorkspaceOwnerEmail);

  if (input.role) {
    await clearExistingRoleHolder(normalizedWorkspaceOwnerEmail, input.role);
  }

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
    role: input.role ?? null,
    created_by_email: normalizedCreatedByEmail,
    created_by_label: normalizedCreatedByLabel || normalizedCreatedByEmail,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("workspace_status_tags")
    .insert(insertPayload)
    .select(
      "id,workspace_owner_email,normalized_name,name,description,source,color_hex,icon_pack,icon_name,role,created_by_email,created_by_label,created_at,updated_at",
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
  role?: StatusRole | null;
}): Promise<TagRow> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(
    input.workspaceOwnerEmail,
  );
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

  if (
    input.role !== undefined &&
    input.role !== null &&
    !isValidRole(input.role)
  ) {
    throw new WorkspaceTagRepositoryError(
      "invalid_role",
      "Invalid status role.",
      400,
    );
  }

  const supabase = getSupabaseServerClient();
  const { data: existingTag } = await supabase
    .from("workspace_status_tags")
    .select("id,name")
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

  if (input.role) {
    await clearExistingRoleHolder(
      normalizedWorkspaceOwnerEmail,
      input.role,
      normalizedTagId,
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
      role: input.role ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_owner_email", normalizedWorkspaceOwnerEmail)
    .eq("id", normalizedTagId)
    .select(
      "id,workspace_owner_email,normalized_name,name,description,source,color_hex,icon_pack,icon_name,role,created_by_email,created_by_label,created_at,updated_at",
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

  const existingName = (existingTag as { name: string }).name;
  await cascadeStatusRename(
    normalizedWorkspaceOwnerEmail,
    existingName,
    normalizedName,
  );

  return mapTagRow(data as WorkspaceTagRowDb);
}

export async function deleteWorkspaceCustomTag(input: {
  workspaceOwnerEmail: string;
  tagId: string;
}): Promise<void> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(
    input.workspaceOwnerEmail,
  );
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
    .select("id,name,role")
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

  if (existing.role) {
    throw new WorkspaceTagRepositoryError(
      "role_in_use",
      "This status is required by the app (dashboard, cooling alerts, or stats) and can't be deleted. Assign its role to another status first, then it'll be deletable.",
      409,
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
