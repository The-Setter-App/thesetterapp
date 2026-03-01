export type AppUserRole = "owner" | "viewer" | "setter" | "closer";
export type TeamMemberRoleDb = "setter" | "closer";

export interface AppUserRow {
  email: string;
  role: AppUserRole;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  display_name: string | null;
  profile_image_base64: string | null;
  profile_image_path: string | null;
  has_completed_onboarding: boolean | null;
  team_owner_email: string | null;
}

export interface TeamMemberRow {
  owner_email: string;
  member_email: string;
  role: TeamMemberRoleDb;
  added_at: string;
  updated_at: string;
}

export interface OtpCodeRow {
  email: string;
  otp: string;
  expires_at: string;
  created_at: string;
}

export interface InstagramAccountRow {
  account_id: string;
  user_email: string;
  access_token: string;
  page_id: string;
  instagram_user_id: string;
  graph_version: string;
  is_connected: boolean;
  connected_at: string;
  updated_at: string;
  page_name: string | null;
  instagram_username: string | null;
}

export interface WorkspaceTagRowDb {
  id: string;
  workspace_owner_email: string;
  normalized_name: string;
  name: string;
  description: string;
  source: "Custom";
  color_hex: string;
  icon_pack: "lu" | "fa6";
  icon_name: string;
  created_by_email: string;
  created_by_label: string;
  created_at: string;
  updated_at: string;
}
