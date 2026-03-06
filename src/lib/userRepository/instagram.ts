import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { InstagramAccountRow } from "@/lib/supabase/types";
import type {
  InstagramAccountConnection,
  InstagramConfig,
  User,
} from "@/types/auth";
import {
  fetchInstagramAccounts,
  getConnectedInstagramAccounts,
  getUser,
} from "./readers";
import { mapAccountRow, normalizeEmail, toIso, toLegacyConfig } from "./shared";

export async function upsertInstagramAccounts(
  email: string,
  accounts: InstagramAccountConnection[],
): Promise<void> {
  if (accounts.length === 0) return;

  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseServerClient();
  const nowIso = toIso(new Date());

  const existingAccounts = await fetchInstagramAccounts(normalizedEmail);
  const existingByKey = new Map<string, InstagramAccountConnection>();
  for (const account of existingAccounts) {
    existingByKey.set(`${account.pageId}:${account.instagramUserId}`, account);
  }

  const rows = accounts.map((account) => {
    const key = `${account.pageId}:${account.instagramUserId}`;
    const existing = existingByKey.get(key);

    return {
      account_id: existing?.accountId ?? account.accountId ?? randomUUID(),
      user_email: normalizedEmail,
      access_token: account.accessToken,
      page_id: account.pageId,
      instagram_user_id: account.instagramUserId,
      graph_version: account.graphVersion || "v24.0",
      is_connected: account.isConnected ?? true,
      connected_at: toIso(account.connectedAt ?? new Date()),
      updated_at: nowIso,
      page_name: account.pageName ?? null,
      instagram_username: account.instagramUsername ?? null,
    };
  });

  const { error } = await supabase
    .from("instagram_accounts")
    .upsert(rows, { onConflict: "user_email,page_id,instagram_user_id" });

  if (error) {
    throw new Error(`Failed to upsert instagram accounts: ${error.message}`);
  }
}

export async function updateInstagramConfig(
  email: string,
  config: InstagramConfig,
): Promise<void> {
  await upsertInstagramAccounts(email, [
    {
      accountId: randomUUID(),
      accessToken: config.accessToken,
      pageId: config.pageId,
      instagramUserId: config.instagramUserId,
      graphVersion: config.graphVersion,
      isConnected: config.isConnected,
      connectedAt: config.updatedAt,
      updatedAt: new Date(),
    },
  ]);
}

export async function disconnectInstagramAccount(
  email: string,
  accountId: string,
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("instagram_accounts")
    .delete()
    .eq("user_email", normalizedEmail)
    .eq("account_id", accountId);

  return !error;
}

export async function getUserByInstagramId(
  instagramId: string,
): Promise<{ user: User; account: InstagramAccountConnection } | null> {
  const supabase = getSupabaseServerClient();
  const { data: account, error } = await supabase
    .from("instagram_accounts")
    .select(
      "account_id,user_email,access_token,page_id,instagram_user_id,graph_version,is_connected,connected_at,updated_at,page_name,instagram_username",
    )
    .eq("instagram_user_id", instagramId)
    .eq("is_connected", true)
    .limit(1)
    .maybeSingle();

  if (error || !account) return null;

  const accountRow = account as InstagramAccountRow;
  const accountModel = mapAccountRow(accountRow);
  const user = await getUser(accountRow.user_email);
  if (!user) return null;
  return { user, account: accountModel };
}

export async function getUserCredentials(
  email: string,
): Promise<InstagramConfig | null> {
  const connectedAccounts = await getConnectedInstagramAccounts(email);
  if (connectedAccounts.length !== 1) return null;
  return toLegacyConfig(connectedAccounts[0]);
}

export async function getOwnerCredentials(): Promise<InstagramConfig | null> {
  const supabase = getSupabaseServerClient();
  const { data: owner } = await supabase
    .from("app_users")
    .select("email")
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!owner) return null;

  const connectedAccounts = await getConnectedInstagramAccounts(owner.email);
  if (connectedAccounts.length !== 1) return null;
  return toLegacyConfig(connectedAccounts[0]);
}
