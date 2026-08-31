create table if not exists public.workspace_comment_automation_variants (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.workspace_comment_automations(id) on delete cascade,
  owner_email text not null references public.app_users(email) on delete cascade,
  message text not null,
  weight int not null default 1 check (weight between 1 and 10),
  trigger_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspace_comment_automation_variants_set_updated_at
before update on public.workspace_comment_automation_variants
for each row execute function public.set_updated_at();

create index if not exists workspace_comment_automation_variants_automation_idx
  on public.workspace_comment_automation_variants(automation_id, created_at asc);

alter table public.workspace_comment_automation_variants enable row level security;
alter table public.workspace_comment_automation_variants force row level security;

-- Bridges the comment webhook (which only knows the commenter's IGSID) to
-- the conversation that appears later via a separate message webhook, so a
-- comment-triggered lead can be attributed back to the variant it received.
create table if not exists public.workspace_comment_automation_pending_sends (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null references public.app_users(email) on delete cascade,
  automation_id uuid not null references public.workspace_comment_automations(id) on delete cascade,
  variant_id uuid references public.workspace_comment_automation_variants(id) on delete set null,
  commenter_instagram_id text not null,
  resolved_conversation_id text,
  sent_at timestamptz not null default now()
);

create index if not exists workspace_comment_automation_pending_sends_lookup_idx
  on public.workspace_comment_automation_pending_sends(owner_email, commenter_instagram_id)
  where resolved_conversation_id is null;

alter table public.workspace_comment_automation_pending_sends enable row level security;
alter table public.workspace_comment_automation_pending_sends force row level security;
