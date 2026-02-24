import { randomUUID } from "node:crypto";
import {
  removeProfileImage,
  resolveProfileImageUrl,
  uploadProfileImageFromDataUrl,
} from "@/lib/profileImageStorage";
import { normalizeDisplayName } from "@/lib/profileValidation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AppUserRole,
  AppUserRow,
  InstagramAccountRow,
  TeamMemberRow,
} from "@/lib/supabase/types";
import {
  type InstagramAccountConnection,
  type InstagramConfig,
  type OTPRecord,
  type TeamMember,
  type TeamMemberRole,
  type User,
} from "@/types/auth";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toIso(date: Date): string {
  return date.toISOString();
}

function fromIso(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function normalizeOptionalDisplayName(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = normalizeDisplayName(value);
  return normalized.length > 0 ? normalized : undefined;
}

function isTeamMemberRole(value: string): value is TeamMemberRole {
  return value === "setter" || value === "closer";
}

function mapTeamRole(role: AppUserRole): User["role"] {
  if (role === "owner" || role === "viewer" || role === "setter" || role === "closer") {
    return role;
  }
  return "viewer";
}

function mapAccountRow(row: InstagramAccountRow): InstagramAccountConnection {
  const now = new Date();
  return {
    accountId: row.account_id,
    accessToken: row.access_token,
    pageId: row.page_id,
    instagramUserId: row.instagram_user_id,
    graphVersion: row.graph_version,
    isConnected: row.is_connected,
    connectedAt: fromIso(row.connected_at, now),
    updatedAt: fromIso(row.updated_at, now),
    pageName: row.page_name ?? undefined,
    instagramUsername: row.instagram_username ?? undefined,
  };
}

function toLegacyConfig(account: InstagramAccountConnection): InstagramConfig {
  return {
    accessToken: account.accessToken,
    pageId: account.pageId,
    instagramUserId: account.instagramUserId,
    graphVersion: account.graphVersion,
    isConnected: account.isConnected,
    updatedAt: account.updatedAt,
  };
}

function getDisplayNameFallback(email: string): string {
  const localPart = email.split("@")[0]?.trim();
  return localPart && localPart.length > 0 ? localPart : email;
}

async function fetchTeamMembers(ownerEmail: string): Promise<TeamMember[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("owner_email,member_email,role,added_at,updated_at")
    .eq("owner_email", ownerEmail)
    .order("added_at", { ascending: true });

  if (error || !data) return [];

  return (data as TeamMemberRow[])
    .filter((row) => isTeamMemberRole(row.role))
    .map((row) => ({
      email: normalizeEmail(row.member_email),
      role: row.role,
      addedAt: new Date(row.added_at),
      updatedAt: new Date(row.updated_at),
    }));
}

async function fetchInstagramAccounts(userEmail: string): Promise<InstagramAccountConnection[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("account_id,user_email,access_token,page_id,instagram_user_id,graph_version,is_connected,connected_at,updated_at,page_name,instagram_username")
    .eq("user_email", userEmail)
    .order("connected_at", { ascending: true });

  if (error || !data) return [];
  return (data as InstagramAccountRow[]).map(mapAccountRow);
}

async function mapUserFromRow(row: AppUserRow): Promise<User> {
  const email = normalizeEmail(row.email);
  const createdAt = new Date(row.created_at);
  const lastLoginAt = row.last_login_at ? new Date(row.last_login_at) : undefined;
  const isOwner = row.role === "owner";
  const profileImageUrl = await resolveProfileImageUrl(row.profile_image_path);

  const teamMembers = isOwner ? await fetchTeamMembers(email) : [];
  const instagramAccounts = await fetchInstagramAccounts(email);

  return {
    email,
    role: mapTeamRole(row.role),
    createdAt,
    lastLoginAt,
    displayName: normalizeOptionalDisplayName(row.display_name),
    profileImageBase64: profileImageUrl ?? row.profile_image_base64 ?? undefined,
    hasCompletedOnboarding:
      typeof row.has_completed_onboarding === "boolean"
        ? row.has_completed_onboarding
        : undefined,
    teamOwnerEmail: !isOwner && row.team_owner_email ? normalizeEmail(row.team_owner_email) : undefined,
    teamMembers,
    instagramAccounts,
  };
}

async function getUserRow(email: string): Promise<AppUserRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("email,role,created_at,updated_at,last_login_at,display_name,profile_image_base64,profile_image_path,has_completed_onboarding,team_owner_email")
    .eq("email", email)
    .maybeSingle();

  if (error || !data) return null;
  return data as AppUserRow;
}

async function findOwnerMembership(
  memberEmail: string,
  preferredOwnerEmail?: string,
): Promise<{ ownerEmail: string; role: TeamMemberRole } | null> {
  const normalizedMemberEmail = normalizeEmail(memberEmail);
  const supabase = getSupabaseServerClient();

  if (preferredOwnerEmail) {
    const ownerEmail = normalizeEmail(preferredOwnerEmail);
    const { data } = await supabase
      .from("team_members")
      .select("owner_email,member_email,role")
      .eq("owner_email", ownerEmail)
      .eq("member_email", normalizedMemberEmail)
      .maybeSingle();

    if (data && isTeamMemberRole((data as TeamMemberRow).role)) {
      return { ownerEmail, role: (data as TeamMemberRow).role };
    }
  }

  const { data } = await supabase
    .from("team_members")
    .select("owner_email,member_email,role")
    .eq("member_email", normalizedMemberEmail)
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const row = data as TeamMemberRow;
  if (!isTeamMemberRole(row.role)) return null;

  const owner = await getUserRow(row.owner_email);
  if (!owner || owner.role !== "owner") return null;

  return {
    ownerEmail: normalizeEmail(row.owner_email),
    role: row.role,
  };
}

export function getUserDisplayName(user: Pick<User, "email" | "displayName">): string {
  const normalized = normalizeOptionalDisplayName(user.displayName);
  return normalized ?? getDisplayNameFallback(user.email);
}

export function isOnboardingRequired(user: Pick<User, "hasCompletedOnboarding">): boolean {
  return user.hasCompletedOnboarding === false;
}

export async function upsertUser(email: string): Promise<User> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseServerClient();
  const now = new Date();

  const existing = await getUserRow(normalizedEmail);

  if (!existing) {
    const insertPayload = {
      email: normalizedEmail,
      role: "viewer" as const,
      created_at: toIso(now),
      updated_at: toIso(now),
      last_login_at: toIso(now),
      has_completed_onboarding: false,
    };

    const { error } = await supabase.from("app_users").insert(insertPayload);
    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    const created = await getUser(normalizedEmail);
    if (!created) throw new Error("Failed to load created user");
    return created;
  }

  let nextRole: AppUserRole = existing.role;
  let nextTeamOwnerEmail: string | null = existing.team_owner_email;

  if (existing.role !== "owner") {
    const membership = await findOwnerMembership(normalizedEmail, existing.team_owner_email ?? undefined);
    if (membership) {
      nextRole = membership.role;
      nextTeamOwnerEmail = membership.ownerEmail;
    } else {
      nextRole = "viewer";
      nextTeamOwnerEmail = null;
    }
  } else {
    nextTeamOwnerEmail = null;
  }

  const { error } = await supabase
    .from("app_users")
    .update({
      role: nextRole,
      team_owner_email: nextTeamOwnerEmail,
      last_login_at: toIso(now),
      updated_at: toIso(now),
    })
    .eq("email", normalizedEmail);

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }

  const updated = await getUser(normalizedEmail);
  if (!updated) throw new Error("Failed to load updated user");
  return updated;
}

export async function createOTP(email: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseServerClient();

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

  await supabase.from("otp_codes").delete().eq("email", normalizedEmail);

  const payload: OTPRecord = {
    email: normalizedEmail,
    otp,
    expiresAt,
    createdAt: now,
  };

  const { error } = await supabase.from("otp_codes").insert({
    email: payload.email,
    otp: payload.otp,
    expires_at: toIso(payload.expiresAt),
    created_at: toIso(payload.createdAt),
  });

  if (error) throw new Error(`Failed to create OTP: ${error.message}`);
  return otp;
}

export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("otp_codes")
    .select("email,otp,expires_at")
    .eq("email", normalizedEmail)
    .eq("otp", otp)
    .gt("expires_at", toIso(new Date()))
    .maybeSingle();

  if (error || !data) return false;

  await supabase.from("otp_codes").delete().eq("email", normalizedEmail).eq("otp", otp);
  return true;
}

export async function getUser(email: string): Promise<User | null> {
  const normalizedEmail = normalizeEmail(email);
  const row = await getUserRow(normalizedEmail);
  if (!row) return null;
  return mapUserFromRow(row);
}

interface UpdateUserProfileInput {
  displayName: string;
  profileImageBase64?: string | null;
  markOnboardingComplete?: boolean;
}

export async function updateUserProfileImage(email: string, profileImageBase64: string | null): Promise<User> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseServerClient();

  const existingRow = await getUserRow(normalizedEmail);
  const previousPath = existingRow?.profile_image_path ?? null;
  let nextPath: string | null = previousPath;

  if (typeof profileImageBase64 === "string" && profileImageBase64.length > 0) {
    nextPath = await uploadProfileImageFromDataUrl(normalizedEmail, profileImageBase64);
  } else if (profileImageBase64 === null) {
    nextPath = null;
  }

  const updates = {
    profile_image_base64: null as string | null,
    profile_image_path: nextPath,
    updated_at: toIso(new Date()),
  };

  const { error } = await supabase.from("app_users").update(updates).eq("email", normalizedEmail);
  if (error) throw new Error(`Failed to update profile image: ${error.message}`);

  if (previousPath && previousPath !== nextPath) {
    await removeProfileImage(previousPath);
  }

  const updatedUser = await getUser(normalizedEmail);
  if (!updatedUser) throw new Error("Failed to load updated user");
  return updatedUser;
}

export async function updateUserProfile(email: string, input: UpdateUserProfileInput): Promise<User> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeDisplayName(input.displayName);
  if (!normalizedName) {
    throw new Error("Display name is required");
  }

  const supabase = getSupabaseServerClient();

  const updates: {
    display_name: string;
    updated_at: string;
    has_completed_onboarding?: boolean;
  } = {
    display_name: normalizedName,
    updated_at: toIso(new Date()),
  };

  if (input.markOnboardingComplete) {
    updates.has_completed_onboarding = true;
  }

  const { error } = await supabase.from("app_users").update(updates).eq("email", normalizedEmail);
  if (error) throw new Error(`Failed to update profile: ${error.message}`);

  if (input.profileImageBase64 !== undefined) {
    await updateUserProfileImage(normalizedEmail, input.profileImageBase64);
  }

  const updatedUser = await getUser(normalizedEmail);
  if (!updatedUser) throw new Error("Failed to load updated user");
  return updatedUser;
}

export async function upsertInstagramAccounts(email: string, accounts: InstagramAccountConnection[]): Promise<void> {
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

  if (error) throw new Error(`Failed to upsert instagram accounts: ${error.message}`);
}

export async function updateInstagramConfig(email: string, config: InstagramConfig): Promise<void> {
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

export async function getConnectedInstagramAccounts(email: string): Promise<InstagramAccountConnection[]> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("account_id,user_email,access_token,page_id,instagram_user_id,graph_version,is_connected,connected_at,updated_at,page_name,instagram_username")
    .eq("user_email", normalizedEmail)
    .eq("is_connected", true)
    .order("connected_at", { ascending: true });

  if (error || !data) return [];
  return (data as InstagramAccountRow[]).map(mapAccountRow);
}

export async function getInstagramAccountById(
  email: string,
  accountId: string,
): Promise<InstagramAccountConnection | null> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("account_id,user_email,access_token,page_id,instagram_user_id,graph_version,is_connected,connected_at,updated_at,page_name,instagram_username")
    .eq("user_email", normalizedEmail)
    .eq("account_id", accountId)
    .eq("is_connected", true)
    .maybeSingle();

  if (error || !data) return null;
  return mapAccountRow(data as InstagramAccountRow);
}

export async function disconnectInstagramAccount(email: string, accountId: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("instagram_accounts")
    .delete()
    .eq("user_email", normalizedEmail)
    .eq("account_id", accountId);

  return !error;
}

export async function getUserCredentials(email: string): Promise<InstagramConfig | null> {
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

  const connectedAccounts = await getConnectedInstagramAccounts((owner as { email: string }).email);
  if (connectedAccounts.length !== 1) return null;
  return toLegacyConfig(connectedAccounts[0]);
}

export async function getUserByInstagramId(
  instagramId: string,
): Promise<{ user: User; account: InstagramAccountConnection } | null> {
  const supabase = getSupabaseServerClient();
  const { data: account, error } = await supabase
    .from("instagram_accounts")
    .select("account_id,user_email,access_token,page_id,instagram_user_id,graph_version,is_connected,connected_at,updated_at,page_name,instagram_username")
    .eq("instagram_user_id", instagramId)
    .eq("is_connected", true)
    .limit(1)
    .maybeSingle();

  if (error || !account) return null;

  const accountModel = mapAccountRow(account as InstagramAccountRow);
  const user = await getUser((account as InstagramAccountRow).user_email);
  if (!user) return null;
  return { user, account: accountModel };
}

export async function getWorkspaceOwnerEmail(email: string): Promise<string | null> {
  const user = await getUser(email);
  if (!user) return null;

  if (user.role === "owner") return user.email;
  if ((user.role === "setter" || user.role === "closer") && user.teamOwnerEmail) {
    return normalizeEmail(user.teamOwnerEmail);
  }

  return user.email;
}

export async function getTeamMembersForOwner(ownerEmail: string): Promise<TeamMember[]> {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const owner = await getUser(normalizedOwnerEmail);
  if (!owner || owner.role !== "owner") return [];
  return fetchTeamMembers(normalizedOwnerEmail);
}

export async function addTeamMemberByOwner(
  ownerEmail: string,
  memberEmail: string,
  role: TeamMemberRole,
): Promise<void> {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const normalizedMemberEmail = normalizeEmail(memberEmail);

  if (!normalizedMemberEmail || !isTeamMemberRole(role)) {
    throw new Error("Invalid team member payload");
  }

  if (normalizedMemberEmail === normalizedOwnerEmail) {
    throw new Error("Owner cannot add themselves as a team member");
  }

  const owner = await getUser(normalizedOwnerEmail);
  if (!owner || owner.role !== "owner") {
    throw new Error("Only owners can manage team members");
  }

  const member = await getUser(normalizedMemberEmail);
  if (member?.role === "owner" && member.email !== normalizedOwnerEmail) {
    throw new Error("This email is already an owner and cannot be added to a team");
  }

  const supabase = getSupabaseServerClient();
  const nowIso = toIso(new Date());

  if (!member) {
    const { error: insertMemberError } = await supabase.from("app_users").insert({
      email: normalizedMemberEmail,
      role,
      created_at: nowIso,
      updated_at: nowIso,
      last_login_at: nowIso,
      has_completed_onboarding: false,
      team_owner_email: normalizedOwnerEmail,
    });
    if (insertMemberError) {
      throw new Error(`Failed to create team member user: ${insertMemberError.message}`);
    }
  } else {
    const { error: updateMemberError } = await supabase
      .from("app_users")
      .update({
        role,
        team_owner_email: normalizedOwnerEmail,
        updated_at: nowIso,
      })
      .eq("email", normalizedMemberEmail);
    if (updateMemberError) {
      throw new Error(`Failed to update team member user: ${updateMemberError.message}`);
    }
  }

  const { error: teamError } = await supabase.from("team_members").upsert(
    {
      owner_email: normalizedOwnerEmail,
      member_email: normalizedMemberEmail,
      role,
      updated_at: nowIso,
      added_at: nowIso,
    },
    { onConflict: "owner_email,member_email" },
  );

  if (teamError) {
    throw new Error(`Failed to upsert team member: ${teamError.message}`);
  }
}

export async function removeTeamMemberByOwner(ownerEmail: string, memberEmail: string): Promise<boolean> {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const normalizedMemberEmail = normalizeEmail(memberEmail);

  if (!normalizedMemberEmail || normalizedMemberEmail === normalizedOwnerEmail) {
    return false;
  }

  const owner = await getUser(normalizedOwnerEmail);
  if (!owner || owner.role !== "owner") {
    throw new Error("Only owners can remove team members");
  }

  const supabase = getSupabaseServerClient();

  const { data: existingMember } = await supabase
    .from("team_members")
    .select("owner_email,member_email")
    .eq("owner_email", normalizedOwnerEmail)
    .eq("member_email", normalizedMemberEmail)
    .maybeSingle();

  if (!existingMember) return false;

  await Promise.all([
    supabase
      .from("team_members")
      .delete()
      .eq("owner_email", normalizedOwnerEmail)
      .eq("member_email", normalizedMemberEmail),
    supabase
      .from("app_users")
      .delete()
      .eq("email", normalizedMemberEmail)
      .eq("team_owner_email", normalizedOwnerEmail),
    supabase.from("otp_codes").delete().eq("email", normalizedMemberEmail),
  ]);

  return true;
}
