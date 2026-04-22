create type public.tag_category as enum ('Lead Stage','Priority','Intent','Follow Up','Custom');

create table if not exists public.workspace_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_owner_email text not null references public.app_users(email) on delete cascade,
  normalized_name text not null,
  name text not null,
  category public.tag_category not null,
  description text not null,
  source text not null default 'Custom',
  inbox_status text not null default 'Not wired yet',
  created_by_email text not null,
  created_by_label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_owner_email, normalized_name)
);

create trigger workspace_tags_set_updated_at
before update on public.workspace_tags
for each row execute function public.set_updated_at();

create index if not exists workspace_tags_owner_created_at_idx on public.workspace_tags(workspace_owner_email, created_at desc);
