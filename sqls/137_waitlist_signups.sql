-- Public waitlist signups from /waitlist. Emails are stored lowercased so the
-- unique constraint also catches case-only duplicates. ip_hash is an HMAC of
-- the client IP (never the raw address) and only exists to cap how many
-- signups one source can create per hour.
create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_signups_ip_hash_created_at_idx
  on public.waitlist_signups(ip_hash, created_at desc);

create index if not exists waitlist_signups_created_at_idx
  on public.waitlist_signups(created_at desc);

alter table public.waitlist_signups enable row level security;
alter table public.waitlist_signups force row level security;
