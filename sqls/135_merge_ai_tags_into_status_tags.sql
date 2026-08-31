-- AI tags were a separate multi-label system that never actually changed a
-- conversation's status, so a tag like "lead mentions $2000+" never fired
-- anything. Every status tag's description now doubles as its AI matching
-- criteria, so this migrates existing custom AI tags into workspace_status_tags
-- (criteria -> description) and retires the old table.
--
-- Wrapped in a table-existence check so this is safe to run more than once:
-- the first successful run drops workspace_ai_tags, so a second run (or a
-- database where it never existed) just no-ops instead of erroring on the
-- SELECT FROM a table that's no longer there.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'workspace_ai_tags'
  ) then
    insert into public.workspace_status_tags (
      id, workspace_owner_email, normalized_name, name, description, source,
      color_hex, icon_pack, icon_name, created_by_email, created_by_label,
      created_at, updated_at
    )
    select
      id, workspace_owner_email, normalized_name, name, criteria, 'Custom',
      color_hex, 'lu', 'LuTag', created_by_email, created_by_email,
      created_at, updated_at
    from public.workspace_ai_tags
    on conflict (workspace_owner_email, normalized_name) do nothing;

    drop table public.workspace_ai_tags;
  end if;
end $$;
