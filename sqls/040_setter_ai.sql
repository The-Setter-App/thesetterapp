create table if not exists public.setter_ai_sessions (
  id uuid primary key default gen_random_uuid(),
  email text not null references public.app_users(email) on delete cascade,
  title text not null,
  linked_inbox_conversation_id text,
  linked_inbox_conversation_label text,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger setter_ai_sessions_set_updated_at
before update on public.setter_ai_sessions
for each row execute function public.set_updated_at();

create index if not exists setter_ai_sessions_email_updated_idx on public.setter_ai_sessions(email, updated_at desc);

create table if not exists public.setter_ai_messages (
  id uuid primary key default gen_random_uuid(),
  email text not null references public.app_users(email) on delete cascade,
  session_id uuid not null references public.setter_ai_sessions(id) on delete cascade,
  role text not null,
  text text not null,
  created_at timestamptz not null default now(),
  request_id text
);

create index if not exists setter_ai_messages_email_session_created_idx on public.setter_ai_messages(email, session_id, created_at);
create unique index if not exists setter_ai_messages_request_id_unique on public.setter_ai_messages(email, session_id, request_id) where request_id is not null;
