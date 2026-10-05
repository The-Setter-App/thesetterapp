-- One reply playbook per workspace: the owner's own instructions for how the
-- team sells, used when Setter drafts suggested replies.
create table if not exists public.workspace_reply_playbooks (
  owner_email text primary key references public.app_users(email) on delete cascade,
  instructions text not null default '' check (char_length(instructions) <= 4000),
  updated_by_email text,
  updated_at timestamptz not null default now()
);

create trigger workspace_reply_playbooks_set_updated_at
before update on public.workspace_reply_playbooks
for each row execute function public.set_updated_at();

alter table public.workspace_reply_playbooks enable row level security;
alter table public.workspace_reply_playbooks force row level security;
