create type public.inbox_sync_status as enum ('pending','running','done','error');

create table if not exists public.inbox_conversations (
  owner_email text not null references public.app_users(email) on delete cascade,
  id text not null,
  payload jsonb not null default '{}'::jsonb,
  unread integer not null default 0,
  status text,
  is_priority boolean not null default false,
  sync_status public.inbox_sync_status,
  sync_before_cursor text,
  sync_completed_at text,
  sync_started_at text,
  sync_error text,
  sync_retry_count integer,
  sync_message_count integer,
  graph_before_cursor text,
  graph_backfill_done boolean,
  summary jsonb,
  notes text,
  payment_details jsonb,
  timeline_events jsonb,
  contact_details jsonb,
  tag_ids text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_email, id)
);

create trigger inbox_conversations_set_updated_at
before update on public.inbox_conversations
for each row execute function public.set_updated_at();

create index if not exists inbox_conversations_owner_updated_idx on public.inbox_conversations(owner_email, updated_at desc, id desc);
create index if not exists inbox_conversations_owner_recipient_idx on public.inbox_conversations(owner_email, (payload->>'recipientId'));

create table if not exists public.inbox_messages (
  owner_email text not null,
  id text not null,
  conversation_id text not null,
  payload jsonb not null default '{}'::jsonb,
  timestamp_text text,
  is_empty boolean,
  client_temp_id text,
  source text,
  type text,
  from_me boolean,
  audio_storage jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_email, id),
  foreign key (owner_email, conversation_id) references public.inbox_conversations(owner_email, id) on delete cascade
);

create trigger inbox_messages_set_updated_at
before update on public.inbox_messages
for each row execute function public.set_updated_at();

create index if not exists inbox_messages_page_idx on public.inbox_messages(owner_email, conversation_id, timestamp_text desc, id desc);
create index if not exists inbox_messages_conversation_idx on public.inbox_messages(owner_email, conversation_id);
create unique index if not exists inbox_messages_client_temp_idx on public.inbox_messages(owner_email, conversation_id, client_temp_id) where client_temp_id is not null;

create table if not exists public.inbox_sync_jobs (
  owner_email text primary key references public.app_users(email) on delete cascade,
  in_progress boolean not null default false,
  total_conversations integer not null default 0,
  completed_conversations integer not null default 0,
  failed_conversations integer not null default 0,
  last_started_at text,
  last_completed_at text,
  last_error text,
  heartbeat_at text,
  updated_at timestamptz not null default now()
);

create trigger inbox_sync_jobs_set_updated_at
before update on public.inbox_sync_jobs
for each row execute function public.set_updated_at();
