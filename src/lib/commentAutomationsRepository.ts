import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export class CommentAutomationRepositoryError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface CommentAutomation {
  id: string;
  name: string;
  keyword: string | null;
  mediaId: string | null;
  replyMessage: string;
  enabled: boolean;
  triggerCount: number;
  createdByEmail: string;
  createdAt: string;
}

interface CommentAutomationRowDb {
  id: string;
  owner_email: string;
  name: string;
  keyword: string | null;
  media_id: string | null;
  reply_message: string;
  enabled: boolean;
  trigger_count: number;
  created_by_email: string;
  created_at: string;
  updated_at: string;
}

const MAX_NAME_LENGTH = 60;
const MAX_KEYWORD_LENGTH = 60;
const MAX_MEDIA_ID_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 1000;

const SELECT_COLUMNS =
  "id,owner_email,name,keyword,media_id,reply_message,enabled,trigger_count,created_by_email,created_at,updated_at";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapRow(row: CommentAutomationRowDb): CommentAutomation {
  return {
    id: row.id,
    name: row.name,
    keyword: row.keyword,
    mediaId: row.media_id,
    replyMessage: row.reply_message,
    enabled: row.enabled,
    triggerCount: row.trigger_count,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
  };
}

export async function listCommentAutomations(
  ownerEmail: string,
): Promise<CommentAutomation[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_comment_automations")
    .select(SELECT_COLUMNS)
    .eq("owner_email", normalizeEmail(ownerEmail))
    .order("created_at", { ascending: true });

  if (error) {
    throw new CommentAutomationRepositoryError(
      "list_failed",
      "Failed to load comment automations.",
      500,
    );
  }

  return ((data ?? []) as CommentAutomationRowDb[]).map(mapRow);
}

/** Enabled automations only, ordered so matchCommentAutomation's "first match wins" is deterministic. */
export async function listActiveCommentAutomations(
  ownerEmail: string,
): Promise<CommentAutomation[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_comment_automations")
    .select(SELECT_COLUMNS)
    .eq("owner_email", normalizeEmail(ownerEmail))
    .eq("enabled", true)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as CommentAutomationRowDb[]).map(mapRow);
}

export async function createCommentAutomation(input: {
  workspaceOwnerEmail: string;
  name: string;
  keyword: string;
  mediaId: string;
  replyMessage: string;
  createdByEmail: string;
}): Promise<CommentAutomation> {
  const normalizedOwnerEmail = normalizeEmail(input.workspaceOwnerEmail);
  const name = input.name.trim();
  const keyword = input.keyword.trim();
  const mediaId = input.mediaId.trim();
  const replyMessage = input.replyMessage.trim();

  if (!name) {
    throw new CommentAutomationRepositoryError(
      "invalid_name",
      "A name is required.",
      400,
    );
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new CommentAutomationRepositoryError(
      "invalid_name_length",
      `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
      400,
    );
  }
  if (keyword.length > MAX_KEYWORD_LENGTH) {
    throw new CommentAutomationRepositoryError(
      "invalid_keyword_length",
      `Keyword must be ${MAX_KEYWORD_LENGTH} characters or fewer.`,
      400,
    );
  }
  if (mediaId.length > MAX_MEDIA_ID_LENGTH) {
    throw new CommentAutomationRepositoryError(
      "invalid_media_id_length",
      `Media id must be ${MAX_MEDIA_ID_LENGTH} characters or fewer.`,
      400,
    );
  }
  if (!replyMessage) {
    throw new CommentAutomationRepositoryError(
      "invalid_reply_message",
      "A reply message is required.",
      400,
    );
  }
  if (replyMessage.length > MAX_MESSAGE_LENGTH) {
    throw new CommentAutomationRepositoryError(
      "invalid_reply_message_length",
      `Reply message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      400,
    );
  }

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("workspace_comment_automations")
    .insert({
      id: randomUUID(),
      owner_email: normalizedOwnerEmail,
      name,
      keyword: keyword || null,
      media_id: mediaId || null,
      reply_message: replyMessage,
      enabled: true,
      trigger_count: 0,
      created_by_email: normalizeEmail(input.createdByEmail),
      created_at: now,
      updated_at: now,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new CommentAutomationRepositoryError(
      "create_failed",
      "Failed to create automation.",
      500,
    );
  }

  return mapRow(data as CommentAutomationRowDb);
}

export async function setCommentAutomationEnabled(input: {
  workspaceOwnerEmail: string;
  automationId: string;
  enabled: boolean;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error, count } = await supabase
    .from("workspace_comment_automations")
    .update(
      { enabled: input.enabled, updated_at: new Date().toISOString() },
      { count: "exact" },
    )
    .eq("owner_email", normalizeEmail(input.workspaceOwnerEmail))
    .eq("id", input.automationId);

  if (error) {
    throw new CommentAutomationRepositoryError(
      "update_failed",
      "Failed to update automation.",
      500,
    );
  }
  if (!count) {
    throw new CommentAutomationRepositoryError(
      "not_found",
      "Automation not found.",
      404,
    );
  }
}

export async function deleteCommentAutomation(input: {
  workspaceOwnerEmail: string;
  automationId: string;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error, count } = await supabase
    .from("workspace_comment_automations")
    .delete({ count: "exact" })
    .eq("owner_email", normalizeEmail(input.workspaceOwnerEmail))
    .eq("id", input.automationId);

  if (error) {
    throw new CommentAutomationRepositoryError(
      "delete_failed",
      "Failed to delete automation.",
      500,
    );
  }
  if (!count) {
    throw new CommentAutomationRepositoryError(
      "not_found",
      "Automation not found.",
      404,
    );
  }
}

export async function incrementCommentAutomationTriggerCount(
  workspaceOwnerEmail: string,
  automationId: string,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("workspace_comment_automations")
    .select("trigger_count")
    .eq("owner_email", normalizeEmail(workspaceOwnerEmail))
    .eq("id", automationId)
    .maybeSingle();

  const currentCount =
    (data as { trigger_count: number } | null)?.trigger_count ?? 0;

  await supabase
    .from("workspace_comment_automations")
    .update({
      trigger_count: currentCount + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_email", normalizeEmail(workspaceOwnerEmail))
    .eq("id", automationId);
}

/**
 * Picks the automation that should fire for a given comment, or null if
 * none match. Media-specific automations are checked before "all posts"
 * ones (mediaId === null); ties broken by creation order, since callers
 * pass automations already sorted oldest-first. A comment should only ever
 * trigger one automation, never several DMs for one comment.
 */
export function matchCommentAutomation(
  automations: CommentAutomation[],
  input: { mediaId: string; commentText: string },
): CommentAutomation | null {
  const normalizedText = input.commentText.toLowerCase();

  const matches = automations.filter((automation) => {
    const mediaMatches =
      automation.mediaId === null || automation.mediaId === input.mediaId;
    if (!mediaMatches) return false;

    if (!automation.keyword) return true;
    return normalizedText.includes(automation.keyword.toLowerCase());
  });

  if (matches.length === 0) return null;

  const mediaSpecific = matches.find(
    (automation) => automation.mediaId !== null,
  );
  return mediaSpecific ?? matches[0];
}
