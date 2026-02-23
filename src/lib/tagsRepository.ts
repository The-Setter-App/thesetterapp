import { randomUUID } from "node:crypto";
import { normalizeTagText, hasDuplicateTagName, isTagCategory, MAX_TAG_DESCRIPTION_LENGTH, MAX_TAG_NAME_LENGTH, PRESET_TAG_ROWS } from "@/lib/tags/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkspaceTagRowDb } from "@/lib/supabase/types";
import type { TagCategory, TagRow } from "@/types/tags";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeTagId(value: string): string {
  return value.trim();
}

function formatTimestamp(value: Date): string {
  return value.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function mapTagRow(row: WorkspaceTagRowDb): TagRow {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    source: "Custom",
    inboxStatus: "Not wired yet",
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

function validateTagPayload(input: { name: string; category: TagCategory; description: string }) {
  const normalizedName = normalizeTagText(input.name);
  if (!normalizedName) {
    throw new WorkspaceTagRepositoryError("invalid_name", "Tag name is required.", 400);
  }

  if (normalizedName.length > MAX_TAG_NAME_LENGTH) {
    throw new WorkspaceTagRepositoryError(
      "invalid_name_length",
      `Tag name must be ${MAX_TAG_NAME_LENGTH} characters or fewer.`,
      400,
    );
  }

  if (!isTagCategory(input.category)) {
    throw new WorkspaceTagRepositoryError("invalid_category", "Invalid tag category.", 400);
  }

  const normalizedDescription = normalizeTagText(input.description);
  if (normalizedDescription.length > MAX_TAG_DESCRIPTION_LENGTH) {
    throw new WorkspaceTagRepositoryError(
      "invalid_description_length",
      `Description must be ${MAX_TAG_DESCRIPTION_LENGTH} characters or fewer.`,
      400,
    );
  }

  if (hasDuplicateTagName(normalizedName, PRESET_TAG_ROWS)) {
    throw new WorkspaceTagRepositoryError("reserved_name", "Tag name already exists in preset tags.", 409);
  }

  return {
    normalizedName,
    normalizedDescription,
  };
}

export async function listWorkspaceCustomTags(workspaceOwnerEmail: string): Promise<TagRow[]> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(workspaceOwnerEmail);
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("workspace_tags")
    .select("id,workspace_owner_email,normalized_name,name,category,description,source,inbox_status,created_by_email,created_by_label,created_at,updated_at")
    .eq("workspace_owner_email", normalizedWorkspaceOwnerEmail)
    .order("created_at", { ascending: false });

  if (error) {
    throw new WorkspaceTagRepositoryError("list_failed", "Failed to load custom tags.", 500);
  }

  return ((data ?? []) as WorkspaceTagRowDb[]).map(mapTagRow);
}

export async function listWorkspaceAssignableTags(workspaceOwnerEmail: string): Promise<TagRow[]> {
  const customTags = await listWorkspaceCustomTags(workspaceOwnerEmail);
  return [...PRESET_TAG_ROWS, ...customTags];
}

export async function createWorkspaceCustomTag(input: {
  workspaceOwnerEmail: string;
  name: string;
  category: TagCategory;
  description: string;
  createdByEmail: string;
  createdByLabel?: string;
}): Promise<TagRow> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(input.workspaceOwnerEmail);
  const normalizedCreatedByEmail = normalizeEmail(input.createdByEmail);
  const normalizedCreatedByLabel = normalizeTagText(input.createdByLabel || "");
  const { normalizedName, normalizedDescription } = validateTagPayload({
    name: input.name,
    category: input.category,
    description: input.description,
  });

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const insertPayload = {
    id: randomUUID(),
    workspace_owner_email: normalizedWorkspaceOwnerEmail,
    normalized_name: normalizedName.toLowerCase(),
    name: normalizedName,
    category: input.category,
    description: normalizedDescription || "No description added",
    source: "Custom" as const,
    inbox_status: "Not wired yet" as const,
    created_by_email: normalizedCreatedByEmail,
    created_by_label: normalizedCreatedByLabel || normalizedCreatedByEmail,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("workspace_tags")
    .insert(insertPayload)
    .select("id,workspace_owner_email,normalized_name,name,category,description,source,inbox_status,created_by_email,created_by_label,created_at,updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new WorkspaceTagRepositoryError("duplicate_tag", "Tag name already exists.", 409);
    }
    throw new WorkspaceTagRepositoryError("create_failed", "Failed to create tag.", 500);
  }

  return mapTagRow(data as WorkspaceTagRowDb);
}

export async function updateWorkspaceCustomTag(input: {
  workspaceOwnerEmail: string;
  tagId: string;
  name: string;
  category: TagCategory;
  description: string;
}): Promise<TagRow> {
  const normalizedWorkspaceOwnerEmail = normalizeEmail(input.workspaceOwnerEmail);
  const normalizedTagId = normalizeTagId(input.tagId);
  if (!normalizedTagId) {
    throw new WorkspaceTagRepositoryError("invalid_tag_id", "Invalid tag id.", 400);
  }

  const { normalizedName, normalizedDescription } = validateTagPayload({
    name: input.name,
    category: input.category,
    description: input.description,
  });

  const supabase = getSupabaseServerClient();

  const { data: existingTag } = await supabase
    .from("workspace_tags")
    .select("id")
    .eq("workspace_owner_email", normalizedWorkspaceOwnerEmail)
    .eq("id", normalizedTagId)
    .maybeSingle();

  if (!existingTag) {
    throw new WorkspaceTagRepositoryError("tag_not_found", "Tag not found.", 404);
  }

  const { data, error } = await supabase
    .from("workspace_tags")
    .update({
      normalized_name: normalizedName.toLowerCase(),
      name: normalizedName,
      category: input.category,
      description: normalizedDescription || "No description added",
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_owner_email", normalizedWorkspaceOwnerEmail)
    .eq("id", normalizedTagId)
    .select("id,workspace_owner_email,normalized_name,name,category,description,source,inbox_status,created_by_email,created_by_label,created_at,updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new WorkspaceTagRepositoryError("duplicate_tag", "Tag name already exists.", 409);
    }
    throw new WorkspaceTagRepositoryError("update_failed", "Failed to update tag.", 500);
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
    throw new WorkspaceTagRepositoryError("invalid_tag_id", "Invalid tag id.", 400);
  }

  const supabase = getSupabaseServerClient();
  const { error, count } = await supabase
    .from("workspace_tags")
    .delete({ count: "exact" })
    .eq("workspace_owner_email", normalizedWorkspaceOwnerEmail)
    .eq("id", normalizedTagId);

  if (error) {
    throw new WorkspaceTagRepositoryError("delete_failed", "Failed to delete tag.", 500);
  }

  if (!count) {
    throw new WorkspaceTagRepositoryError("tag_not_found", "Tag not found.", 404);
  }
}
