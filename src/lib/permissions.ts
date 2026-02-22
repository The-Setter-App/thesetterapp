import type { UserRole } from "@/types/auth";

export function canAccessInbox(role: UserRole): boolean {
  return role !== "viewer";
}

export function canManageTeam(role: UserRole): boolean {
  return role === "owner";
}

export function canAccessSocialSettings(role: UserRole): boolean {
  return role === "owner";
}

export function canAccessIntegrationSettings(role: UserRole): boolean {
  return role === "owner";
}

export function canAccessTeamSettings(role: UserRole): boolean {
  return role !== "viewer";
}

export function canAccessTagsSettings(role: UserRole): boolean {
  return role !== "viewer";
}

export function getDefaultSettingsRoute(role: UserRole): string {
  if (role === "owner") return "/settings/profile";
  if (role === "setter" || role === "closer") return "/settings/team";
  return "/settings/profile";
}
