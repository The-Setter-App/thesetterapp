do $$
begin
  if to_regclass('public.inbox_calendly_invites') is not null then
    execute 'truncate table public.inbox_calendly_invites';
  end if;

  if to_regclass('public.inbox_call_events') is not null then
    execute 'truncate table public.inbox_call_events';
  end if;

  if to_regclass('public.workspace_calendly_connections') is not null then
    execute 'truncate table public.workspace_calendly_connections';

    execute 'alter table public.workspace_calendly_connections drop column if exists personal_access_token';

    execute 'alter table public.workspace_calendly_connections add column if not exists oauth_access_token text';
    execute 'alter table public.workspace_calendly_connections add column if not exists oauth_refresh_token text';
    execute 'alter table public.workspace_calendly_connections add column if not exists oauth_access_token_expires_at timestamptz';
    execute 'alter table public.workspace_calendly_connections add column if not exists oauth_scope text';
    execute 'alter table public.workspace_calendly_connections add column if not exists oauth_token_type text';
    execute 'alter table public.workspace_calendly_connections add column if not exists calendly_user_uri text';
    execute 'alter table public.workspace_calendly_connections add column if not exists organization_uri text';

    execute 'update public.workspace_calendly_connections
      set
        oauth_access_token = coalesce(oauth_access_token, ''''),
        oauth_refresh_token = coalesce(oauth_refresh_token, ''''),
        oauth_access_token_expires_at = coalesce(oauth_access_token_expires_at, now())';

    execute 'alter table public.workspace_calendly_connections alter column oauth_access_token set not null';
    execute 'alter table public.workspace_calendly_connections alter column oauth_refresh_token set not null';
    execute 'alter table public.workspace_calendly_connections alter column oauth_access_token_expires_at set not null';
  end if;
end
$$;
