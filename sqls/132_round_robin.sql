create table if not exists public.workspace_round_robin_config (
  owner_email text primary key references public.app_users(email) on delete cascade,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger workspace_round_robin_config_set_updated_at
before update on public.workspace_round_robin_config
for each row execute function public.set_updated_at();

create table if not exists public.workspace_round_robin_members (
  owner_email text not null references public.app_users(email) on delete cascade,
  member_email text not null,
  weight int not null default 1 check (weight between 1 and 10),
  assigned_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (owner_email, member_email)
);

create trigger workspace_round_robin_members_set_updated_at
before update on public.workspace_round_robin_members
for each row execute function public.set_updated_at();

alter table public.workspace_round_robin_config enable row level security;
alter table public.workspace_round_robin_config force row level security;
alter table public.workspace_round_robin_members enable row level security;
alter table public.workspace_round_robin_members force row level security;
