create table if not exists public.workspace_calendly_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_owner_email text not null references public.app_users(email) on delete cascade,
  personal_access_token text not null,
  scheduling_url text not null,
  webhook_signing_key text not null,
  webhook_subscription_uri text,
  is_connected boolean not null default true,
  connected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_owner_email)
);

create trigger workspace_calendly_connections_set_updated_at
before update on public.workspace_calendly_connections
for each row execute function public.set_updated_at();

create index if not exists workspace_calendly_connections_owner_updated_idx
  on public.workspace_calendly_connections(workspace_owner_email, updated_at desc);

create table if not exists public.inbox_call_events (
  owner_email text not null references public.app_users(email) on delete cascade,
  id text not null,
  conversation_id text,
  calendly_event_uri text,
  calendly_invitee_uri text,
  event_type text not null,
  status text not null,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text,
  join_url text,
  cancel_url text,
  reschedule_url text,
  invitee_name text,
  invitee_email text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_email, id),
  foreign key (owner_email, conversation_id)
    references public.inbox_conversations(owner_email, id)
    on delete set null
);

create trigger inbox_call_events_set_updated_at
before update on public.inbox_call_events
for each row execute function public.set_updated_at();

create index if not exists inbox_call_events_owner_conversation_start_idx
  on public.inbox_call_events(owner_email, conversation_id, start_time desc, id desc);

create unique index if not exists inbox_call_events_owner_event_invitee_idx
  on public.inbox_call_events(owner_email, calendly_event_uri, calendly_invitee_uri)
  where calendly_event_uri is not null and calendly_invitee_uri is not null;

alter table public.workspace_calendly_connections enable row level security;
alter table public.workspace_calendly_connections force row level security;
alter table public.inbox_call_events enable row level security;
alter table public.inbox_call_events force row level security;
