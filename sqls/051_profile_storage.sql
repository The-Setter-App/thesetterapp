insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', false)
on conflict (id) do update set public = excluded.public;
