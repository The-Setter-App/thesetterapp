import { getSupabaseServerClient } from "@/lib/supabase/server";

const WAITLIST_TABLE = "waitlist_signups";
const UNIQUE_VIOLATION_CODE = "23505";

export class WaitlistRepositoryError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type WaitlistInsertResult = "created" | "already_joined";

export async function insertWaitlistSignup(input: {
  email: string;
  ipHash: string;
}): Promise<WaitlistInsertResult> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from(WAITLIST_TABLE).insert({
    email: input.email,
    ip_hash: input.ipHash,
  });

  if (!error) return "created";
  if (error.code === UNIQUE_VIOLATION_CODE) return "already_joined";

  throw new WaitlistRepositoryError(
    "insert_failed",
    `Failed to store waitlist signup: ${error.message}`,
  );
}

export async function countWaitlistSignupsSince(input: {
  ipHash: string;
  sinceIso: string;
}): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from(WAITLIST_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", input.ipHash)
    .gte("created_at", input.sinceIso);

  if (error) {
    throw new WaitlistRepositoryError(
      "count_failed",
      `Failed to count recent waitlist signups: ${error.message}`,
    );
  }

  return count ?? 0;
}
