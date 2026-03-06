import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppUserRole } from "@/lib/supabase/types";
import type { User } from "@/types/auth";
import { findOwnerMembership, getUser, getUserRow } from "./readers";
import { normalizeEmail, toIso } from "./shared";

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
    const membership = await findOwnerMembership(
      normalizedEmail,
      existing.team_owner_email ?? undefined,
    );
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
