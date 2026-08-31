import { randomUUID } from "node:crypto";
import {
  normalizeStatusColorHex,
  normalizeStatusKey,
} from "@/lib/status/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export class AiTagRepositoryError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface AiTagRow {
  id: string;
  name: string;
  criteria: string;
  colorHex: string;
  createdByEmail: string;
  createdAt: string;
}

interface AiTagRowDb {
  id: string;
  workspace_owner_email: string;
  normalized_name: string;
  name: string;
  criteria: string;
  color_hex: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
}

const MAX_NAME_LENGTH = 40;
const MAX_CRITERIA_LENGTH = 400;
const DEFAULT_COLOR_HEX = "#8771FF";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapRow(row: AiTagRowDb): AiTagRow {
  return {
    id: row.id,
    name: row.name,
    criteria: row.criteria,
    colorHex: row.color_hex,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS =
  "id,workspace_owner_email,normalized_name,name,criteria,color_hex,created_by_email,created_at,updated_at";

export async function listWorkspaceAiTags(
  workspaceOwnerEmail: string,
): Promise<AiTagRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_ai_tags")
    .select(SELECT_COLUMNS)
    .eq("workspace_owner_email", normalizeEmail(workspaceOwnerEmail))
    .order("created_at", { ascending: false });

  if (error) {
    throw new AiTagRepositoryError(
      "list_failed",
      "Failed to load AI tags.",
      500,
    );
  }

  return ((data ?? []) as AiTagRowDb[]).map(mapRow);
}

export async function createWorkspaceAiTag(input: {
  workspaceOwnerEmail: string;
  name: string;
  criteria: string;
  colorHex: string;
  createdByEmail: string;
}): Promise<AiTagRow> {
  const normalizedOwnerEmail = normalizeEmail(input.workspaceOwnerEmail);
  const name = input.name.trim();
  const criteria = input.criteria.trim();

  if (!name) {
    throw new AiTagRepositoryError(
      "invalid_name",
      "A tag name is required.",
      400,
    );
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new AiTagRepositoryError(
      "invalid_name_length",
      `Tag name must be ${MAX_NAME_LENGTH} characters or fewer.`,
      400,
    );
  }
  if (!criteria) {
    throw new AiTagRepositoryError(
      "invalid_criteria",
      "Describe what makes a conversation match this tag.",
      400,
    );
  }
  if (criteria.length > MAX_CRITERIA_LENGTH) {
    throw new AiTagRepositoryError(
      "invalid_criteria_length",
      `Criteria must be ${MAX_CRITERIA_LENGTH} characters or fewer.`,
      400,
    );
  }

  const normalizedColorHex =
    normalizeStatusColorHex(input.colorHex) || DEFAULT_COLOR_HEX;

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("workspace_ai_tags")
    .insert({
      id: randomUUID(),
      workspace_owner_email: normalizedOwnerEmail,
      normalized_name: normalizeStatusKey(name),
      name,
      criteria,
      color_hex: normalizedColorHex,
      created_by_email: normalizeEmail(input.createdByEmail),
      created_at: now,
      updated_at: now,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new AiTagRepositoryError(
        "duplicate_tag",
        "An AI tag with this name already exists.",
        409,
      );
    }
    throw new AiTagRepositoryError(
      "create_failed",
      "Failed to create AI tag.",
      500,
    );
  }

  return mapRow(data as AiTagRowDb);
}

export async function deleteWorkspaceAiTag(input: {
  workspaceOwnerEmail: string;
  tagId: string;
}): Promise<void> {
  const normalizedOwnerEmail = normalizeEmail(input.workspaceOwnerEmail);
  const tagId = input.tagId.trim();
  if (!tagId) {
    throw new AiTagRepositoryError("invalid_tag_id", "Invalid AI tag id.", 400);
  }

  const supabase = getSupabaseServerClient();
  const { error, count } = await supabase
    .from("workspace_ai_tags")
    .delete({ count: "exact" })
    .eq("workspace_owner_email", normalizedOwnerEmail)
    .eq("id", tagId);

  if (error) {
    throw new AiTagRepositoryError(
      "delete_failed",
      "Failed to delete AI tag.",
      500,
    );
  }
  if (!count) {
    throw new AiTagRepositoryError("tag_not_found", "AI tag not found.", 404);
  }
}
