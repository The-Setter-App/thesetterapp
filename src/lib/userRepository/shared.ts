import { normalizeDisplayName } from "@/lib/profileValidation";
import type { AppUserRole, InstagramAccountRow } from "@/lib/supabase/types";
import type {
  InstagramAccountConnection,
  InstagramConfig,
  TeamMemberRole,
  User,
} from "@/types/auth";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function fromIso(
  value: string | null | undefined,
  fallback: Date,
): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function normalizeOptionalDisplayName(
  value: string | null | undefined,
): string | undefined {
  if (!value) return undefined;
  const normalized = normalizeDisplayName(value);
  return normalized.length > 0 ? normalized : undefined;
}

export function isTeamMemberRole(value: string): value is TeamMemberRole {
  return value === "setter" || value === "closer";
}

export function mapTeamRole(role: AppUserRole): User["role"] {
  if (
    role === "owner" ||
    role === "viewer" ||
    role === "setter" ||
    role === "closer"
  ) {
    return role;
  }
  return "viewer";
}

export function mapAccountRow(
  row: InstagramAccountRow,
): InstagramAccountConnection {
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

export function toLegacyConfig(
  account: InstagramAccountConnection,
): InstagramConfig {
  return {
    accessToken: account.accessToken,
    pageId: account.pageId,
    instagramUserId: account.instagramUserId,
    graphVersion: account.graphVersion,
    isConnected: account.isConnected,
    updatedAt: account.updatedAt,
  };
}

export function getDisplayNameFallback(email: string): string {
  const localPart = email.split("@")[0]?.trim();
  return localPart && localPart.length > 0 ? localPart : email;
}
