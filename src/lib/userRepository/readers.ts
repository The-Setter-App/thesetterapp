import { resolveProfileImageUrl } from "@/lib/profileImageStorage";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AppUserRow,
  InstagramAccountRow,
  TeamMemberRow,
} from "@/lib/supabase/types";
import type {
  InstagramAccountConnection,
  TeamMember,
  TeamMemberRole,
  User,
} from "@/types/auth";
import {
  getDisplayNameFallback,
  isTeamMemberRole,
  mapAccountRow,
  mapTeamRole,
  normalizeEmail,
  normalizeOptionalDisplayName,
} from "./shared";

export async function fetchTeamMembers(
  ownerEmail: string,
): Promise<TeamMember[]> {
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

export async function fetchInstagramAccounts(
  userEmail: string,
): Promise<InstagramAccountConnection[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select(
      "account_id,user_email,access_token,page_id,instagram_user_id,graph_version,is_connected,connected_at,updated_at,page_name,instagram_username",
    )
    .eq("user_email", userEmail)
    .order("connected_at", { ascending: true });

  if (error || !data) return [];
  return (data as InstagramAccountRow[]).map(mapAccountRow);
}

export async function mapUserFromRow(row: AppUserRow): Promise<User> {
  const email = normalizeEmail(row.email);
  const createdAt = new Date(row.created_at);
  const lastLoginAt = row.last_login_at
    ? new Date(row.last_login_at)
    : undefined;
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
    profileImageBase64:
      profileImageUrl ?? row.profile_image_base64 ?? undefined,
    hasCompletedOnboarding:
      typeof row.has_completed_onboarding === "boolean"
        ? row.has_completed_onboarding
        : undefined,
    teamOwnerEmail:
      !isOwner && row.team_owner_email
        ? normalizeEmail(row.team_owner_email)
        : undefined,
    teamMembers,
    instagramAccounts,
  };
}

export async function getUserRow(email: string): Promise<AppUserRow | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_users")
    .select(
      "email,role,created_at,updated_at,last_login_at,display_name,profile_image_base64,profile_image_path,has_completed_onboarding,team_owner_email",
    )
    .eq("email", email)
    .maybeSingle();

  if (error || !data) return null;
  return data as AppUserRow;
}

export async function findOwnerMembership(
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

export function getUserDisplayName(
  user: Pick<User, "email" | "displayName">,
): string {
  const normalized = normalizeOptionalDisplayName(user.displayName);
  return normalized ?? getDisplayNameFallback(user.email);
}

export function isOnboardingRequired(
  user: Pick<User, "hasCompletedOnboarding">,
): boolean {
  return user.hasCompletedOnboarding === false;
}

export async function getUser(email: string): Promise<User | null> {
  const normalizedEmail = normalizeEmail(email);
  const row = await getUserRow(normalizedEmail);
  if (!row) return null;
  return mapUserFromRow(row);
}

export async function getConnectedInstagramAccounts(
  email: string,
): Promise<InstagramAccountConnection[]> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select(
      "account_id,user_email,access_token,page_id,instagram_user_id,graph_version,is_connected,connected_at,updated_at,page_name,instagram_username",
    )
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
    .select(
      "account_id,user_email,access_token,page_id,instagram_user_id,graph_version,is_connected,connected_at,updated_at,page_name,instagram_username",
    )
    .eq("user_email", normalizedEmail)
    .eq("account_id", accountId)
    .eq("is_connected", true)
    .maybeSingle();

  if (error || !data) return null;
  return mapAccountRow(data as InstagramAccountRow);
}

export async function getWorkspaceOwnerEmail(
  email: string,
): Promise<string | null> {
  const user = await getUser(email);
  if (!user) return null;

  if (user.role === "owner") return user.email;
  if (
    (user.role === "setter" || user.role === "closer") &&
    user.teamOwnerEmail
  ) {
    return normalizeEmail(user.teamOwnerEmail);
  }

  return user.email;
}

export async function getTeamMembersForOwner(
  ownerEmail: string,
): Promise<TeamMember[]> {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const owner = await getUser(normalizedOwnerEmail);
  if (!owner || owner.role !== "owner") return [];
  return fetchTeamMembers(normalizedOwnerEmail);
}
