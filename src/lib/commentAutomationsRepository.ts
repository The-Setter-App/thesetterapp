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

export interface CommentAutomationVariant {
  id: string;
  automationId: string;
  message: string;
  weight: number;
  triggerCount: number;
}

interface CommentAutomationVariantRowDb {
  id: string;
  automation_id: string;
  owner_email: string;
  message: string;
  weight: number;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

const VARIANT_SELECT_COLUMNS =
  "id,automation_id,owner_email,message,weight,trigger_count,created_at,updated_at";

function mapVariantRow(
  row: CommentAutomationVariantRowDb,
): CommentAutomationVariant {
  return {
    id: row.id,
    automationId: row.automation_id,
    message: row.message,
    weight: row.weight,
    triggerCount: row.trigger_count,
  };
}

export async function listAutomationVariants(
  ownerEmail: string,
  automationId: string,
): Promise<CommentAutomationVariant[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("workspace_comment_automation_variants")
    .select(VARIANT_SELECT_COLUMNS)
    .eq("owner_email", normalizeEmail(ownerEmail))
    .eq("automation_id", automationId)
    .order("created_at", { ascending: true });

  return ((data ?? []) as CommentAutomationVariantRowDb[]).map(mapVariantRow);
}

export async function createAutomationVariant(input: {
  workspaceOwnerEmail: string;
  automationId: string;
  message: string;
  weight: number;
}): Promise<CommentAutomationVariant> {
  const message = input.message.trim();
  if (!message) {
    throw new CommentAutomationRepositoryError(
      "invalid_message",
      "A message is required.",
      400,
    );
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new CommentAutomationRepositoryError(
      "invalid_message_length",
      `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      400,
    );
  }

  const weight = Math.round(input.weight);
  if (!Number.isFinite(weight) || weight < 1 || weight > 10) {
    throw new CommentAutomationRepositoryError(
      "invalid_weight",
      "Weight must be between 1 and 10.",
      400,
    );
  }

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("workspace_comment_automation_variants")
    .insert({
      id: randomUUID(),
      automation_id: input.automationId,
      owner_email: normalizeEmail(input.workspaceOwnerEmail),
      message,
      weight,
      trigger_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select(VARIANT_SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new CommentAutomationRepositoryError(
      "create_failed",
      "Failed to create variant.",
      500,
    );
  }

  return mapVariantRow(data as CommentAutomationVariantRowDb);
}

export async function deleteAutomationVariant(input: {
  workspaceOwnerEmail: string;
  variantId: string;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error, count } = await supabase
    .from("workspace_comment_automation_variants")
    .delete({ count: "exact" })
    .eq("owner_email", normalizeEmail(input.workspaceOwnerEmail))
    .eq("id", input.variantId);

  if (error) {
    throw new CommentAutomationRepositoryError(
      "delete_failed",
      "Failed to delete variant.",
      500,
    );
  }
  if (!count) {
    throw new CommentAutomationRepositoryError(
      "not_found",
      "Variant not found.",
      404,
    );
  }
}

/** Weighted-random pick among variants - standard A/B test assignment, not rotation. */
export function pickVariant(
  variants: CommentAutomationVariant[],
): CommentAutomationVariant | null {
  if (variants.length === 0) return null;
  const totalWeight = variants.reduce(
    (sum, variant) => sum + variant.weight,
    0,
  );
  let roll = Math.random() * totalWeight;
  for (const variant of variants) {
    roll -= variant.weight;
    if (roll <= 0) return variant;
  }
  return variants[variants.length - 1];
}

export async function incrementVariantTriggerCount(
  ownerEmail: string,
  variantId: string,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("workspace_comment_automation_variants")
    .select("trigger_count")
    .eq("owner_email", normalizeEmail(ownerEmail))
    .eq("id", variantId)
    .maybeSingle();

  const currentCount =
    (data as { trigger_count: number } | null)?.trigger_count ?? 0;

  await supabase
    .from("workspace_comment_automation_variants")
    .update({
      trigger_count: currentCount + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_email", normalizeEmail(ownerEmail))
    .eq("id", variantId);
}

export async function recordPendingCommentAutomationSend(input: {
  ownerEmail: string;
  automationId: string;
  variantId: string | null;
  commenterInstagramId: string;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.from("workspace_comment_automation_pending_sends").insert({
    id: randomUUID(),
    owner_email: normalizeEmail(input.ownerEmail),
    automation_id: input.automationId,
    variant_id: input.variantId,
    commenter_instagram_id: input.commenterInstagramId,
    sent_at: new Date().toISOString(),
  });
}

export interface ResolvedCommentAutomationSend {
  automationId: string;
  variantId: string | null;
}

/**
 * Looks up an unresolved pending send for this participant (matched by
 * Instagram user id) and marks it resolved with the conversation that just
 * appeared for them. Returns null for the overwhelmingly common case where
 * this conversation didn't originate from a comment automation.
 */
export async function resolvePendingCommentAutomationSend(
  ownerEmail: string,
  participantInstagramId: string,
  conversationId: string,
): Promise<ResolvedCommentAutomationSend | null> {
  if (!participantInstagramId) return null;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("workspace_comment_automation_pending_sends")
    .select("id,automation_id,variant_id")
    .eq("owner_email", normalizeEmail(ownerEmail))
    .eq("commenter_instagram_id", participantInstagramId)
    .is("resolved_conversation_id", null)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const pending = data as {
    id: string;
    automation_id: string;
    variant_id: string | null;
  };

  await supabase
    .from("workspace_comment_automation_pending_sends")
    .update({ resolved_conversation_id: conversationId })
    .eq("id", pending.id);

  return { automationId: pending.automation_id, variantId: pending.variant_id };
}

export interface VariantConversionStats {
  variantId: string | null;
  sent: number;
  replied: number;
  qualified: number;
  booked: number;
}

const QUALIFIED_OR_LATER_STATUSES = new Set(["Qualified", "Booked", "Won"]);
const BOOKED_STATUSES = new Set(["Booked", "Won"]);

/**
 * Reply/qualify/book rate per variant for an automation, computed from the
 * conversations it produced. Qualify/book are current-status snapshots
 * (a lead that moved past Qualified and back wouldn't show as qualified
 * here) rather than a full history read - a reasonable approximation given
 * the volumes this settings page needs to render at.
 */
export async function getAutomationConversionStats(
  ownerEmail: string,
  automationId: string,
): Promise<VariantConversionStats[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("inbox_conversations")
    .select("payload")
    .eq("owner_email", normalizeEmail(ownerEmail))
    .filter("payload->>commentAutomationId", "eq", automationId);

  const rows = (data ?? []) as Array<{
    payload: {
      commentAutomationVariantId?: string;
      lastInboundAt?: string;
      status?: string;
    };
  }>;

  const byVariant = new Map<string | null, VariantConversionStats>();
  for (const row of rows) {
    const variantId = row.payload.commentAutomationVariantId ?? null;
    const stats = byVariant.get(variantId) ?? {
      variantId,
      sent: 0,
      replied: 0,
      qualified: 0,
      booked: 0,
    };
    stats.sent += 1;
    if (row.payload.lastInboundAt) stats.replied += 1;
    if (
      row.payload.status &&
      QUALIFIED_OR_LATER_STATUSES.has(row.payload.status)
    ) {
      stats.qualified += 1;
    }
    if (row.payload.status && BOOKED_STATUSES.has(row.payload.status)) {
      stats.booked += 1;
    }
    byVariant.set(variantId, stats);
  }

  return Array.from(byVariant.values());
}

export interface CommentAutomationWithDetails extends CommentAutomation {
  variants: CommentAutomationVariant[];
  stats: VariantConversionStats[];
}

/** Everything the settings page needs to render in one call: automations, each with its variants and conversion stats. */
export async function listCommentAutomationsWithDetails(
  ownerEmail: string,
): Promise<CommentAutomationWithDetails[]> {
  const automations = await listCommentAutomations(ownerEmail);

  return Promise.all(
    automations.map(async (automation) => {
      const [variants, stats] = await Promise.all([
        listAutomationVariants(ownerEmail, automation.id),
        getAutomationConversionStats(ownerEmail, automation.id),
      ]);
      return { ...automation, variants, stats };
    }),
  );
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
