import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@/types/inbox";

export class BlockedUsernameRepositoryError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface BlockedUsernameRow {
  username: string;
  createdByEmail: string | null;
  createdAt: string;
}

interface BlockedUsernameRowDb {
  owner_email: string;
  username_normalized: string;
  username_display: string;
  created_by_email: string | null;
  created_at: string;
}

const MAX_USERNAME_LENGTH = 60;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toDisplayUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}

export function toNormalizedUsername(raw: string): string {
  return toDisplayUsername(raw).toLowerCase();
}

export function extractUsernameFromUser(user: Pick<User, "name">): string {
  return toNormalizedUsername(user.name || "");
}

function mapRow(row: BlockedUsernameRowDb): BlockedUsernameRow {
  return {
    username: row.username_display,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
  };
}

export async function listBlockedUsernames(
  workspaceOwnerEmail: string,
): Promise<BlockedUsernameRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_blocked_usernames")
    .select(
      "owner_email,username_normalized,username_display,created_by_email,created_at",
    )
    .eq("owner_email", normalizeEmail(workspaceOwnerEmail))
    .order("created_at", { ascending: false });

  if (error) {
    throw new BlockedUsernameRepositoryError(
      "list_failed",
      "Failed to load blocked usernames.",
      500,
    );
  }

  return ((data ?? []) as BlockedUsernameRowDb[]).map(mapRow);
}

export async function getBlockedUsernameSet(
  workspaceOwnerEmail: string,
): Promise<Set<string>> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_blocked_usernames")
    .select("username_normalized")
    .eq("owner_email", normalizeEmail(workspaceOwnerEmail));

  if (error || !data) return new Set();
  return new Set(
    (data as { username_normalized: string }[]).map(
      (row) => row.username_normalized,
    ),
  );
}

export async function addBlockedUsername(input: {
  workspaceOwnerEmail: string;
  username: string;
  createdByEmail: string;
}): Promise<BlockedUsernameRow> {
  const normalizedOwnerEmail = normalizeEmail(input.workspaceOwnerEmail);
  const displayUsername = toDisplayUsername(input.username);
  const normalizedUsername = displayUsername.toLowerCase();

  if (!normalizedUsername) {
    throw new BlockedUsernameRepositoryError(
      "invalid_username",
      "A username is required.",
      400,
    );
  }

  if (normalizedUsername.length > MAX_USERNAME_LENGTH) {
    throw new BlockedUsernameRepositoryError(
      "invalid_username_length",
      `Username must be ${MAX_USERNAME_LENGTH} characters or fewer.`,
      400,
    );
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_blocked_usernames")
    .upsert(
      {
        owner_email: normalizedOwnerEmail,
        username_normalized: normalizedUsername,
        username_display: displayUsername,
        created_by_email: normalizeEmail(input.createdByEmail),
        created_at: new Date().toISOString(),
      },
      { onConflict: "owner_email,username_normalized" },
    )
    .select(
      "owner_email,username_normalized,username_display,created_by_email,created_at",
    )
    .single();

  if (error || !data) {
    throw new BlockedUsernameRepositoryError(
      "create_failed",
      "Failed to block username.",
      500,
    );
  }

  return mapRow(data as BlockedUsernameRowDb);
}

export async function removeBlockedUsername(input: {
  workspaceOwnerEmail: string;
  username: string;
}): Promise<void> {
  const normalizedOwnerEmail = normalizeEmail(input.workspaceOwnerEmail);
  const normalizedUsername = toNormalizedUsername(input.username);

  const supabase = getSupabaseServerClient();
  const { error, count } = await supabase
    .from("workspace_blocked_usernames")
    .delete({ count: "exact" })
    .eq("owner_email", normalizedOwnerEmail)
    .eq("username_normalized", normalizedUsername);

  if (error) {
    throw new BlockedUsernameRepositoryError(
      "delete_failed",
      "Failed to unblock username.",
      500,
    );
  }

  if (!count) {
    throw new BlockedUsernameRepositoryError(
      "not_found",
      "Blocked username not found.",
      404,
    );
  }
}
