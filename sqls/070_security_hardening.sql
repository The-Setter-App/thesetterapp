-- Supabase hardening: server-only data access and private storage defaults.

-- 1) Enable and force RLS for all application tables.
alter table public.app_users enable row level security;
alter table public.team_members enable row level security;
alter table public.otp_codes enable row level security;
alter table public.instagram_accounts enable row level security;
alter table public.workspace_tags enable row level security;
alter table public.inbox_conversations enable row level security;
alter table public.inbox_messages enable row level security;
alter table public.inbox_sync_jobs enable row level security;
alter table public.setter_ai_sessions enable row level security;
alter table public.setter_ai_messages enable row level security;

alter table public.app_users force row level security;
alter table public.team_members force row level security;
alter table public.otp_codes force row level security;
alter table public.instagram_accounts force row level security;
alter table public.workspace_tags force row level security;
alter table public.inbox_conversations force row level security;
alter table public.inbox_messages force row level security;
alter table public.inbox_sync_jobs force row level security;
alter table public.setter_ai_sessions force row level security;
alter table public.setter_ai_messages force row level security;

-- 2) Remove public/authenticated access from application schema objects.
revoke usage on schema public from anon, authenticated;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all routines in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on routines from anon, authenticated;

-- Keep the app RPC callable only by service role.
revoke execute on function public.append_setter_ai_exchange(text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.append_setter_ai_exchange(text, uuid, text, text, text) to service_role;

-- 3) Storage hardening for server-only usage.
update storage.buckets
set public = false
where id in ('profile-images', 'voice-notes');

revoke all on table storage.objects from anon, authenticated;
revoke all on table storage.buckets from anon, authenticated;
