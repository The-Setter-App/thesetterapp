create table if not exists public.otp_rate_limits (
  key text primary key,
  action text not null check (action in ('send', 'verify')),
  count integer not null default 0 check (count >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create trigger otp_rate_limits_set_updated_at
before update on public.otp_rate_limits
for each row execute function public.set_updated_at();

create index if not exists otp_rate_limits_action_idx
  on public.otp_rate_limits (action);
create index if not exists otp_rate_limits_blocked_until_idx
  on public.otp_rate_limits (blocked_until);

alter table public.otp_rate_limits enable row level security;
alter table public.otp_rate_limits force row level security;

revoke all on table public.otp_rate_limits from anon, authenticated;
