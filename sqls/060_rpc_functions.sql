create or replace function public.append_setter_ai_exchange(
  p_email text,
  p_session_id uuid,
  p_user_text text,
  p_ai_text text,
  p_request_id text default null
)
returns void
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_existing integer;
begin
  if p_request_id is not null then
    select count(*) into v_existing
    from public.setter_ai_messages
    where email = p_email and session_id = p_session_id and request_id = p_request_id;

    if v_existing > 0 then
      return;
    end if;
  end if;

  insert into public.setter_ai_messages (email, session_id, role, text, created_at, request_id)
  values (p_email, p_session_id, 'user', p_user_text, v_now, p_request_id);

  insert into public.setter_ai_messages (email, session_id, role, text, created_at)
  values (p_email, p_session_id, 'ai', p_ai_text, v_now);

  update public.setter_ai_sessions
  set
    updated_at = v_now,
    last_message_preview = p_ai_text
  where id = p_session_id and email = p_email;
end;
$$;
