-- Full flexibility for status tags: the 8 defaults become real, editable,
-- deletable rows per workspace instead of hardcoded/untouchable presets.
-- `role` lets features that need to recognize a specific stage (dashboard
-- funnel, lead cooling exclusions, split-test stats, the default status for
-- brand-new leads) key off a stable semantic role instead of matching the
-- literal display name, so renaming a tag never silently breaks them.
alter table public.workspace_status_tags
  add column if not exists role text;

alter table public.workspace_status_tags
  drop constraint if exists workspace_status_tags_role_check;
alter table public.workspace_status_tags
  add constraint workspace_status_tags_role_check
  check (role is null or role in (
    'new', 'in_contact', 'qualified', 'booked', 'won',
    'unqualified', 'no_show', 'retarget'
  ));

-- At most one tag per workspace can hold a given role.
create unique index if not exists workspace_status_tags_unique_role_idx
  on public.workspace_status_tags(workspace_owner_email, role)
  where role is not null;

-- Seed the 8 defaults (with their roles) for every existing owner. Safe to
-- re-run: ON CONFLICT skips any name already taken, e.g. an owner who
-- already created a custom tag literally named "Won".
insert into public.workspace_status_tags (
  id, workspace_owner_email, normalized_name, name, description, source,
  color_hex, icon_pack, icon_name, role, created_by_email, created_by_label,
  created_at, updated_at
)
select
  gen_random_uuid(),
  au.email,
  defaults.normalized_name,
  defaults.name,
  defaults.description,
  'Default',
  defaults.color_hex,
  defaults.icon_pack,
  defaults.icon_name,
  defaults.role,
  au.email,
  'System',
  now(),
  now()
from public.app_users au
cross join (
  values
    ('new lead', 'New Lead', 'Incoming lead that has not been contacted yet.', '#F472B6', 'lu', 'LuUserPlus', 'new'),
    ('in-contact', 'In-Contact', 'Lead is actively being engaged by the team.', '#22C55E', 'lu', 'LuMessageCircle', 'in_contact'),
    ('qualified', 'Qualified', 'Lead matches your qualification criteria.', '#FBBF24', 'fa6', 'FaStar', 'qualified'),
    ('unqualified', 'Unqualified', 'Lead does not match your qualification criteria.', '#EF4444', 'lu', 'LuUserX', 'unqualified'),
    ('retarget', 'Retarget', 'Lead should be revisited in a future follow-up cycle.', '#2C6CD6', 'fa6', 'FaArrowsSpin', 'retarget'),
    ('won', 'Won', 'Lead converted successfully.', '#16A34A', 'lu', 'LuTrophy', 'won'),
    ('no-show', 'No-Show', 'Lead missed the scheduled appointment.', '#FB7185', 'lu', 'LuCalendarX2', 'no_show'),
    ('booked', 'Booked', 'Lead has a booked call or session.', '#5B21B6', 'lu', 'LuCalendarCheck2', 'booked')
) as defaults(normalized_name, name, description, color_hex, icon_pack, icon_name, role)
where au.role = 'owner'
on conflict (workspace_owner_email, normalized_name) do nothing;
