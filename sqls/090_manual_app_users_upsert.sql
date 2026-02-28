-- Replace the email placeholder and run in Supabase SQL editor.
insert into public.app_users (
  email,
  role,
  has_completed_onboarding,
  last_login_at
)
values (
  lower(trim('replace_with_user_email@example.com')),
  'owner'::public.app_user_role,
  false,
  now()
)
on conflict (email) do update
set
  role = 'owner'::public.app_user_role,
  updated_at = now(),
  last_login_at = now();
