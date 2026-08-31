import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchTeamMembers } from "@/lib/userRepository/readers";
import { getDisplayNameFallback } from "@/lib/userRepository/shared";

export class RoundRobinRepositoryError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface RoundRobinMember {
  email: string;
  label: string;
  weight: number;
  assignedCount: number;
}

interface RoundRobinMemberRowDb {
  owner_email: string;
  member_email: string;
  weight: number;
  assigned_count: number;
}

const MIN_WEIGHT = 1;
const MAX_WEIGHT = 10;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function resolveDisplayLabels(
  emails: string[],
): Promise<Record<string, string>> {
  if (emails.length === 0) return {};
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("app_users")
    .select("email,display_name")
    .in("email", emails);

  const labels: Record<string, string> = {};
  for (const email of emails) {
    labels[email] = getDisplayNameFallback(email);
  }
  for (const row of (data ?? []) as Array<{
    email: string;
    display_name: string | null;
  }>) {
    if (row.display_name?.trim()) {
      labels[row.email] = row.display_name.trim();
    }
  }
  return labels;
}

/**
 * Every current setter on the team, joined against their round-robin
 * weight/assigned-count (defaulting to weight 1, count 0 for a setter who
 * has never had a row created yet - e.g. just added to the team).
 */
export async function listRoundRobinMembers(
  ownerEmail: string,
): Promise<RoundRobinMember[]> {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const setters = (await fetchTeamMembers(normalizedOwnerEmail)).filter(
    (member) => member.role === "setter",
  );
  if (setters.length === 0) return [];

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("workspace_round_robin_members")
    .select("owner_email,member_email,weight,assigned_count")
    .eq("owner_email", normalizedOwnerEmail);

  const rowsByEmail = new Map(
    ((data ?? []) as RoundRobinMemberRowDb[]).map((row) => [
      row.member_email,
      row,
    ]),
  );
  const labels = await resolveDisplayLabels(setters.map((s) => s.email));

  return setters.map((setter) => {
    const row = rowsByEmail.get(setter.email);
    return {
      email: setter.email,
      label: labels[setter.email] || getDisplayNameFallback(setter.email),
      weight: row?.weight ?? 1,
      assignedCount: row?.assigned_count ?? 0,
    };
  });
}

export async function isRoundRobinEnabled(
  ownerEmail: string,
): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("workspace_round_robin_config")
    .select("enabled")
    .eq("owner_email", normalizeEmail(ownerEmail))
    .maybeSingle();

  return Boolean((data as { enabled: boolean } | null)?.enabled);
}

export async function setRoundRobinEnabled(
  ownerEmail: string,
  enabled: boolean,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.from("workspace_round_robin_config").upsert(
    {
      owner_email: normalizeEmail(ownerEmail),
      enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_email" },
  );
}

export async function setRoundRobinMemberWeight(input: {
  ownerEmail: string;
  memberEmail: string;
  weight: number;
}): Promise<void> {
  const weight = Math.round(input.weight);
  if (!Number.isFinite(weight) || weight < MIN_WEIGHT || weight > MAX_WEIGHT) {
    throw new RoundRobinRepositoryError(
      "invalid_weight",
      `Weight must be between ${MIN_WEIGHT} and ${MAX_WEIGHT}.`,
      400,
    );
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("workspace_round_robin_members").upsert(
    {
      owner_email: normalizeEmail(input.ownerEmail),
      member_email: normalizeEmail(input.memberEmail),
      weight,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_email,member_email" },
  );

  if (error) {
    throw new RoundRobinRepositoryError(
      "update_failed",
      "Failed to update weight.",
      500,
    );
  }
}

/**
 * Picks the next setter for a brand-new lead and records the pick, so the
 * next call sees an updated count. This is a plain read-then-write, not an
 * atomic increment - under truly concurrent new-lead bursts two picks could
 * theoretically read the same count before either writes back, causing a
 * setter to be slightly over-picked. Acceptable for this workspace's scale
 * (a handful of new leads at a time, not a high-throughput queue); revisit
 * with a Postgres function if that assumption stops holding.
 */
export async function pickNextRoundRobinAssignee(
  ownerEmail: string,
): Promise<{ email: string; label: string } | null> {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const enabled = await isRoundRobinEnabled(normalizedOwnerEmail);
  if (!enabled) return null;

  const members = await listRoundRobinMembers(normalizedOwnerEmail);
  if (members.length === 0) return null;

  let picked = members[0];
  let pickedRatio = picked.assignedCount / picked.weight;
  for (const member of members.slice(1)) {
    const ratio = member.assignedCount / member.weight;
    if (
      ratio < pickedRatio ||
      (ratio === pickedRatio && member.assignedCount < picked.assignedCount)
    ) {
      picked = member;
      pickedRatio = ratio;
    }
  }

  const supabase = getSupabaseServerClient();
  await supabase.from("workspace_round_robin_members").upsert(
    {
      owner_email: normalizedOwnerEmail,
      member_email: picked.email,
      weight: picked.weight,
      assigned_count: picked.assignedCount + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_email,member_email" },
  );

  return { email: picked.email, label: picked.label };
}
