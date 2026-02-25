import { getSupabaseServerClient } from "@/lib/supabase/server";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getAppUserExists(email: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase.from("app_users").select("email").eq("email", normalizedEmail).maybeSingle();
  if (error) {
    throw new Error(`Failed to lookup user: ${error.message}`);
  }

  return Boolean(data);
}

export async function createOwnerUser(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { error } = await supabase.from("app_users").insert({
    email: normalizedEmail,
    role: "owner",
    created_at: nowIso,
    updated_at: nowIso,
    last_login_at: nowIso,
    has_completed_onboarding: false,
  });

  if (error) {
    throw new Error(`Failed to create owner: ${error.message}`);
  }
}

