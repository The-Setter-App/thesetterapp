create type public.app_user_role as enum ('owner','viewer','setter','closer');
create type public.team_member_role as enum ('setter','closer');

create table if not exists public.app_users (
  email text primary key,
  role public.app_user_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  display_name text,
  profile_image_base64 text,
  profile_image_path text,
  has_completed_onboarding boolean default false,
  team_owner_email text references public.app_users(email) on delete set null
);

create trigger app_users_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

create table if not exists public.team_members (
  owner_email text not null references public.app_users(email) on delete cascade,
  member_email text not null references public.app_users(email) on delete cascade,
  role public.team_member_role not null,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_email, member_email)
);

create trigger team_members_set_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

create table if not exists public.otp_codes (
  email text not null,
  otp text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (email, otp)
);

create index if not exists otp_codes_email_idx on public.otp_codes(email);
create index if not exists otp_codes_expires_at_idx on public.otp_codes(expires_at);

create table if not exists public.instagram_accounts (
  account_id uuid primary key default gen_random_uuid(),
  user_email text not null references public.app_users(email) on delete cascade,
  access_token text not null,
  page_id text not null,
  instagram_user_id text not null,
  graph_version text not null default 'v24.0',
  is_connected boolean not null default true,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  page_name text,
  instagram_username text,
  unique (user_email, page_id, instagram_user_id)
);

create trigger instagram_accounts_set_updated_at
before update on public.instagram_accounts
for each row execute function public.set_updated_at();

create index if not exists instagram_accounts_user_email_idx on public.instagram_accounts(user_email);
create index if not exists instagram_accounts_ig_user_idx on public.instagram_accounts(instagram_user_id);
