create table if not exists public.inbox_calendly_invites (
  owner_email text not null,
  invite_id text not null,
  conversation_id text not null,
  created_by_email text not null references public.app_users(email) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_event_uri text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_email, invite_id),
  foreign key (owner_email, conversation_id)
    references public.inbox_conversations(owner_email, id)
    on delete cascade
);

create trigger inbox_calendly_invites_set_updated_at
before update on public.inbox_calendly_invites
for each row execute function public.set_updated_at();

create index if not exists inbox_calendly_invites_owner_conversation_idx
  on public.inbox_calendly_invites(owner_email, conversation_id, created_at desc);

alter table public.inbox_calendly_invites enable row level security;
alter table public.inbox_calendly_invites force row level security;
