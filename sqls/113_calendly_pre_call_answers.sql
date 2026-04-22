alter table public.inbox_call_events
  add column if not exists pre_call_answers jsonb;
