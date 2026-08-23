-- Cover images for blog posts.
--
-- Run once, after schema.sql (SQL Editor → paste → Run).
-- The bucket is public to read — these are pictures on a public website — but
-- only the addresses listed in public.admins may put anything in it.

insert into storage.buckets (id, name, public)
values ('blog', 'blog', true)
on conflict (id) do update set public = true;

drop policy if exists "blog images are public" on storage.objects;
create policy "blog images are public"
  on storage.objects for select
  using (bucket_id = 'blog');

drop policy if exists "admins upload blog images" on storage.objects;
create policy "admins upload blog images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blog' and public.is_admin());

drop policy if exists "admins replace blog images" on storage.objects;
create policy "admins replace blog images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'blog' and public.is_admin())
  with check (bucket_id = 'blog' and public.is_admin());

drop policy if exists "admins delete blog images" on storage.objects;
create policy "admins delete blog images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'blog' and public.is_admin());
