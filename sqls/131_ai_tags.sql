create table if not exists public.workspace_ai_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_owner_email text not null references public.app_users(email) on delete cascade,
  normalized_name text not null,
  name text not null,
  criteria text not null,
  color_hex text not null,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_owner_email, normalized_name)
);

create trigger workspace_ai_tags_set_updated_at
before update on public.workspace_ai_tags
for each row execute function public.set_updated_at();

create index if not exists workspace_ai_tags_owner_created_at_idx
  on public.workspace_ai_tags(workspace_owner_email, created_at desc);

alter table public.workspace_ai_tags enable row level security;
alter table public.workspace_ai_tags force row level security;
