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

export interface WorkspaceCalendlyConnectionRow {
  id: string;
  workspace_owner_email: string;
  personal_access_token: string;
  scheduling_url: string;
  webhook_signing_key: string;
  webhook_subscription_uri: string | null;
  is_connected: boolean;
  connected_at: string;
  created_at: string;
  updated_at: string;
}

export interface InboxCallEventRow {
  owner_email: string;
  id: string;
  conversation_id: string | null;
  calendly_event_uri: string | null;
  calendly_invitee_uri: string | null;
  event_type: string;
  status: string;
  title: string;
  start_time: string;
  end_time: string;
  timezone: string | null;
  join_url: string | null;
  cancel_url: string | null;
  reschedule_url: string | null;
  invitee_name: string | null;
  invitee_email: string | null;
  raw_payload: unknown;
  created_at: string;
  updated_at: string;
}

export interface InboxCalendlyInviteRow {
  owner_email: string;
  invite_id: string;
  conversation_id: string;
  created_by_email: string;
  expires_at: string;
  consumed_at: string | null;
  consumed_event_uri: string | null;
  created_at: string;
  updated_at: string;
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
