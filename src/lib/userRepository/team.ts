import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { TeamMemberRole } from "@/types/auth";
import { getUser } from "./readers";
import { isTeamMemberRole, normalizeEmail, toIso } from "./shared";

export interface WorkspaceOwnershipTransferResult {
  previousOwnerEmail: string;
  newOwnerEmail: string;
  previousOwnerNewRole: TeamMemberRole;
  teamMembersMoved: number;
  conversationsMoved: number;
  messagesMoved: number;
  callEventsMoved: number;
  calendlyInvitesMoved: number;
  syncJobMoved: number;
  statusTagsMoved: number;
  statusTagsSkipped: number;
  calendlyConnectionMoved: number;
  calendlyConnectionSkipped: number;
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
    throw new Error(
      "This email is already an owner and cannot be added to a team",
    );
  }

  const supabase = getSupabaseServerClient();
  const nowIso = toIso(new Date());

  if (!member) {
    const { error: insertMemberError } = await supabase
      .from("app_users")
      .insert({
        email: normalizedMemberEmail,
        role,
        created_at: nowIso,
        updated_at: nowIso,
        last_login_at: nowIso,
        has_completed_onboarding: false,
        team_owner_email: normalizedOwnerEmail,
      });
    if (insertMemberError) {
      throw new Error(
        `Failed to create team member user: ${insertMemberError.message}`,
      );
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
      throw new Error(
        `Failed to update team member user: ${updateMemberError.message}`,
      );
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

export async function removeTeamMemberByOwner(
  ownerEmail: string,
  memberEmail: string,
): Promise<boolean> {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const normalizedMemberEmail = normalizeEmail(memberEmail);

  if (
    !normalizedMemberEmail ||
    normalizedMemberEmail === normalizedOwnerEmail
  ) {
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

export async function transferWorkspaceOwnership(
  currentOwnerEmail: string,
  newOwnerEmail: string,
  previousOwnerNewRole: TeamMemberRole = "closer",
): Promise<WorkspaceOwnershipTransferResult> {
  const normalizedCurrentOwnerEmail = normalizeEmail(currentOwnerEmail);
  const normalizedNewOwnerEmail = normalizeEmail(newOwnerEmail);

  if (!normalizedNewOwnerEmail) {
    throw new Error("New owner email is required");
  }

  if (normalizedNewOwnerEmail === normalizedCurrentOwnerEmail) {
    throw new Error("New owner must be different from the current owner");
  }

  if (!isTeamMemberRole(previousOwnerNewRole)) {
    throw new Error("Invalid role for the previous owner");
  }

  const owner = await getUser(normalizedCurrentOwnerEmail);
  if (!owner || owner.role !== "owner") {
    throw new Error("Only the workspace owner can transfer ownership");
  }

  const isExistingTeamMember = (owner.teamMembers ?? []).some(
    (member) => normalizeEmail(member.email) === normalizedNewOwnerEmail,
  );
  if (!isExistingTeamMember) {
    throw new Error(
      "Ownership can only be transferred to an existing team member",
    );
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("transfer_workspace_ownership", {
    p_current_owner_email: normalizedCurrentOwnerEmail,
    p_new_owner_email: normalizedNewOwnerEmail,
    p_previous_owner_new_role: previousOwnerNewRole,
  });

  if (error) {
    throw new Error(`Failed to transfer ownership: ${error.message}`);
  }

  const result = data as Record<string, unknown>;
  return {
    previousOwnerEmail: String(result.previous_owner_email),
    newOwnerEmail: String(result.new_owner_email),
    previousOwnerNewRole: result.previous_owner_new_role as TeamMemberRole,
    teamMembersMoved: Number(result.team_members_moved ?? 0),
    conversationsMoved: Number(result.conversations_moved ?? 0),
    messagesMoved: Number(result.messages_moved ?? 0),
    callEventsMoved: Number(result.call_events_moved ?? 0),
    calendlyInvitesMoved: Number(result.calendly_invites_moved ?? 0),
    syncJobMoved: Number(result.sync_job_moved ?? 0),
    statusTagsMoved: Number(result.status_tags_moved ?? 0),
    statusTagsSkipped: Number(result.status_tags_skipped ?? 0),
    calendlyConnectionMoved: Number(result.calendly_connection_moved ?? 0),
    calendlyConnectionSkipped: Number(result.calendly_connection_skipped ?? 0),
  };
}
