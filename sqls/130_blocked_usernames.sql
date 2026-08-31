create table if not exists public.workspace_blocked_usernames (
  owner_email text not null references public.app_users(email) on delete cascade,
  username_normalized text not null,
  username_display text not null,
  created_by_email text,
  created_at timestamptz not null default now(),
  primary key (owner_email, username_normalized)
);

create index if not exists workspace_blocked_usernames_owner_created_at_idx
  on public.workspace_blocked_usernames(owner_email, created_at desc);

alter table public.workspace_blocked_usernames enable row level security;
alter table public.workspace_blocked_usernames force row level security;
