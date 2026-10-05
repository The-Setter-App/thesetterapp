import { getSupabaseServerClient } from "@/lib/supabase/server";

// Mirrors the length check on the table.
export const MAX_REPLY_PLAYBOOK_LENGTH = 4000;

const TABLE = "workspace_reply_playbooks";

export class ReplyPlaybookError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// The workspace's reply playbook, or an empty string when none is saved.
// Suggested replies still work without one, so a failed read is logged and
// treated as "no playbook" instead of stopping the reply from being drafted.
export async function getReplyPlaybook(
  workspaceOwnerEmail: string,
): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("instructions")
    .eq("owner_email", normalizeEmail(workspaceOwnerEmail))
    .maybeSingle();

  if (error) {
    console.error("[ReplyPlaybook] Failed to load playbook:", error.message);
    return "";
  }

  const instructions: unknown = data?.instructions;
  return typeof instructions === "string" ? instructions : "";
}

export async function saveReplyPlaybook(input: {
  workspaceOwnerEmail: string;
  instructions: string;
  updatedByEmail: string;
}): Promise<string> {
  const instructions = input.instructions.trim();
  if (instructions.length > MAX_REPLY_PLAYBOOK_LENGTH) {
    throw new ReplyPlaybookError(
      `The playbook can be at most ${MAX_REPLY_PLAYBOOK_LENGTH.toLocaleString()} characters.`,
      400,
    );
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from(TABLE).upsert(
    {
      owner_email: normalizeEmail(input.workspaceOwnerEmail),
      instructions,
      updated_by_email: normalizeEmail(input.updatedByEmail),
    },
    { onConflict: "owner_email" },
  );

  if (error) {
    console.error("[ReplyPlaybook] Failed to save playbook:", error.message);
    throw new ReplyPlaybookError("Could not save the playbook.", 500);
  }

  return instructions;
}
