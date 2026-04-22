import { getSupabaseServerClient } from "@/lib/supabase/server";

export const CONVERSATIONS_COLLECTION = "inbox_conversations";
export const MESSAGES_COLLECTION = "inbox_messages";
export const SYNC_COLLECTION = "inbox_sync_jobs";
export const AUDIO_BUCKET = "voice-notes";
export const EMPTY_PREVIEW = "No messages yet";

export function getInboxSupabase() {
  return getSupabaseServerClient();
}
