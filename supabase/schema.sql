-- DeepSurg blog storage.
--
-- Run once against a fresh Supabase project (SQL Editor → paste → Run).
-- The site talks to this directly from the browser with the anon key, so every
-- rule that matters is enforced here by row level security, not in Angular.

-- Who is allowed to write posts. Being signed in is not enough: an address has
-- to be listed here, so an unexpected sign-up cannot publish anything.
create table if not exists public.admins (
  email text primary key,
  added_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Nobody reads this table from the browser; the policies below consult it
-- server-side. No select policy is deliberate.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  tag text not null default 'News',
  cover_url text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_published_at_idx
  on public.posts (published_at desc nulls last);

alter table public.posts enable row level security;

-- Helper: is the caller an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- The public site reads published posts only.
drop policy if exists "published posts are public" on public.posts;
create policy "published posts are public"
  on public.posts for select
  using (published = true);

-- Admins see everything, drafts included.
drop policy if exists "admins read all posts" on public.posts;
create policy "admins read all posts"
  on public.posts for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins write posts" on public.posts;
create policy "admins write posts"
  on public.posts for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admins update posts" on public.posts;
create policy "admins update posts"
  on public.posts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete posts" on public.posts;
create policy "admins delete posts"
  on public.posts for delete
  to authenticated
  using (public.is_admin());

-- Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

-- Seed the people who may publish. Add or remove addresses here.
insert into public.admins (email) values
  ('omar@deepsurg.ai')
on conflict (email) do nothing;
