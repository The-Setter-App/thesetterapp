"use server";

// Server actions for the Team settings tab. Each one checks that the caller
// owns the workspace, validates its input, and reports the outcome back to
// the page through the `success` or `error` query parameter.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/currentUser";
import { sendTeamInvitationEmail } from "@/lib/email";
import {
  addTeamMemberByOwner,
  removeTeamMemberByOwner,
  transferWorkspaceOwnership,
} from "@/lib/userRepository";
import type { TeamMemberRole } from "@/types/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addTeamMemberAction(formData: FormData) {
  const { user } = await requireCurrentUser();
  if (user.role !== "owner") {
    redirect("/settings/team");
  }

  const emailValue = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const roleValue = String(formData.get("role") || "")
    .trim()
    .toLowerCase();

  if (!EMAIL_REGEX.test(emailValue)) {
    redirect("/settings/team?error=invalid_email");
  }

  if (roleValue !== "setter" && roleValue !== "closer") {
    redirect("/settings/team?error=invalid_role");
  }

  try {
    await addTeamMemberByOwner(
      user.email,
      emailValue,
      roleValue as TeamMemberRole,
    );

    await sendTeamInvitationEmail({
      ownerEmail: user.email,
      memberEmail: emailValue,
      role: roleValue as TeamMemberRole,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed_to_add_member";
    redirect(`/settings/team?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/settings/team");
  redirect("/settings/team?success=member_saved");
}

export async function updateTeamMemberRoleAction(formData: FormData) {
  const { user } = await requireCurrentUser();
  if (user.role !== "owner") {
    redirect("/settings/team");
  }

  const emailValue = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const roleValue = String(formData.get("role") || "")
    .trim()
    .toLowerCase();

  if (!EMAIL_REGEX.test(emailValue)) {
    redirect("/settings/team?error=invalid_email");
  }

  if (roleValue !== "setter" && roleValue !== "closer") {
    redirect("/settings/team?error=invalid_role");
  }

  try {
    await addTeamMemberByOwner(
      user.email,
      emailValue,
      roleValue as TeamMemberRole,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed_to_update_role";
    redirect(`/settings/team?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/settings/team");
  redirect("/settings/team?success=role_updated");
}

export async function removeTeamMemberAction(formData: FormData) {
  const { user } = await requireCurrentUser();
  if (user.role !== "owner") {
    redirect("/settings/team");
  }

  const emailValue = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  if (!EMAIL_REGEX.test(emailValue)) {
    redirect("/settings/team?error=invalid_email");
  }

  try {
    await removeTeamMemberByOwner(user.email, emailValue);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed_to_remove_member";
    redirect(`/settings/team?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/settings/team");
  redirect("/settings/team?success=member_removed");
}

export async function transferOwnershipAction(formData: FormData) {
  const { user } = await requireCurrentUser();
  if (user.role !== "owner") {
    redirect("/settings/team");
  }

  const newOwnerEmail = String(formData.get("newOwnerEmail") || "")
    .trim()
    .toLowerCase();
  const roleValue = String(formData.get("previousOwnerNewRole") || "")
    .trim()
    .toLowerCase();

  if (!EMAIL_REGEX.test(newOwnerEmail)) {
    redirect("/settings/team?error=invalid_email");
  }

  if (roleValue !== "setter" && roleValue !== "closer") {
    redirect("/settings/team?error=invalid_role");
  }

  try {
    await transferWorkspaceOwnership(
      user.email,
      newOwnerEmail,
      roleValue as TeamMemberRole,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed_to_transfer_ownership";
    redirect(`/settings/team?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/settings/team");
  redirect("/settings/team?success=ownership_transferred");
}
