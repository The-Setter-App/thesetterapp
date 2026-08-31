create table if not exists public.workspace_comment_automations (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null references public.app_users(email) on delete cascade,
  name text not null,
  keyword text,
  media_id text,
  reply_message text not null,
  enabled boolean not null default true,
  trigger_count int not null default 0,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspace_comment_automations_set_updated_at
before update on public.workspace_comment_automations
for each row execute function public.set_updated_at();

create index if not exists workspace_comment_automations_owner_idx
  on public.workspace_comment_automations(owner_email, created_at desc);

alter table public.workspace_comment_automations enable row level security;
alter table public.workspace_comment_automations force row level security;
