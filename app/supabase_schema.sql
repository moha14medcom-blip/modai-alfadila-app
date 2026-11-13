-- ============================================================================
--  مدّعي الفضيلة — Supabase schema (Auth + PostgreSQL + Storage)
--  Run this once in the Supabase SQL editor.
--
--  Design notes
--  ------------
--  * The client talks to PostgREST directly. Every camelCase domain field is
--    converted to snake_case on the way out (`rowOut`) and back on the way in
--    (`rowIn`), so column names here match the app's data model 1:1.
--  * PRIVATE tables are owner-scoped by `owner_id` (text — holds either the
--    Supabase uuid or the offline pseudo-id).
--  * SHARED tables are app-wide. Reads are open to signed-in users; writes are
--    restricted to the Super-Admin (see `public.is_super_admin()`).
--  * Without keys the app never touches any of this — it runs 100% offline
--    against the IndexedDB vault.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
--  Super-admin helper — the single account allowed to write shared data.
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'moha14med.com@gmail.com';
$$;

-- ===========================================================================
--  PRIVATE COLLECTIONS
-- ===========================================================================

create table if not exists public.projects (
  id                text primary key,
  owner_id          text not null,
  name              text not null default '',
  color             text not null default '#8b5cf6',
  emoji             text not null default '📁',
  "order"           integer not null default 1,
  created_at_local  text,
  created_at        timestamptz not null default now()
);

create table if not exists public.lists (
  id          text primary key,
  owner_id    text not null,
  project_id  text not null,
  name        text not null default '',
  emoji       text not null default '📋',
  "order"     integer not null default 1,
  created_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id             text primary key,
  owner_id       text not null,
  list_id        text not null,
  project_id     text not null,
  project_name   text not null default '',
  list_name      text not null default '',
  title          text not null default '',
  unit_id        text,
  unit_name      text not null default '',
  unit_icon      text not null default '⭐',
  icon           text not null default '✅',
  egp            numeric not null default 0,
  xp             numeric not null default 0,
  done           boolean not null default false,
  done_at        text,
  focus_minutes  integer not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists public.inventory (
  id            text primary key,
  owner_id      text not null,
  item_id       text not null,
  name          text not null default '',
  "desc"        text not null default '',
  egp           numeric not null default 0,
  icon          text not null default '🎁',
  duration_min  integer not null default 30,
  remaining_ms  bigint not null default 0,
  running       boolean not null default false,
  ends_at       bigint,
  status        text not null default 'ready',
  bought_at     text,
  created_at    timestamptz not null default now()
);

create table if not exists public.focus_logs (
  id          text primary key,
  owner_id    text not null,
  minutes     integer not null default 0,
  egp         numeric not null default 0,
  xp          numeric not null default 0,
  mode        text not null default 'pomodoro',
  task_id     text,
  task_title  text not null default '',
  list_id     text,
  at          text,
  created_at  timestamptz not null default now()
);

create index if not exists projects_owner_idx   on public.projects (owner_id);
create index if not exists lists_owner_idx      on public.lists (owner_id);
create index if not exists tasks_owner_idx      on public.tasks (owner_id);
create index if not exists inventory_owner_idx  on public.inventory (owner_id);
create index if not exists focus_logs_owner_idx on public.focus_logs (owner_id);

-- ===========================================================================
--  SHARED COLLECTIONS
-- ===========================================================================

create table if not exists public.profiles (
  id               text primary key,
  email            text,
  username         text not null default '',
  display_name     text not null default '',
  avatar_color     text not null default '#8b5cf6',
  avatar_url       text not null default '',
  cover_url        text not null default '',
  level            integer not null default 1,
  xp               numeric not null default 0,
  egp              numeric not null default 0,
  total_tasks      integer not null default 0,
  total_focus_min  integer not null default 0,
  weekly_week      text not null default '',
  weekly_tasks     integer not null default 0,
  weekly_focus_min integer not null default 0,
  weekly_egp       numeric not null default 0,
  streak           integer not null default 1,
  last_active_day  text not null default '',
  blocked          boolean not null default false,
  theme            text not null default 'virtue',
  sound_volume     numeric not null default 0.85,
  timer_notify     boolean not null default false,
  created_at       text,
  updated_at       timestamptz not null default now()
);

create table if not exists public.reward_units (
  id          text primary key,
  name        text not null default '',
  egp         numeric not null default 0,
  xp          numeric not null default 0,
  icon        text not null default '⭐',
  active      boolean not null default true,
  "order"     integer not null default 1,
  created_at  timestamptz not null default now()
);

create table if not exists public.reward_requests (
  id            text primary key,
  name          text not null default '',
  "desc"        text not null default '',
  icon          text not null default '🎁',
  egp           numeric not null default 0,
  kind          text not null default 'store',
  duration_min  integer not null default 30,
  status        text not null default 'pending',
  user_id       text,
  user_name     text not null default '',
  username      text not null default '',
  at            text,
  created_at    timestamptz not null default now()
);

create table if not exists public.store_items (
  id              text primary key,
  name            text not null default '',
  "desc"          text not null default '',
  icon            text not null default '🎁',
  egp             numeric not null default 0,
  duration_min    integer not null default 30,
  active          boolean not null default true,
  owner_id        text,
  requested_by    text,
  source_request  text,
  created_at      timestamptz not null default now()
);

create table if not exists public.friends (
  id              text primary key,
  from_id         text not null,
  from_name       text not null default '',
  from_username   text not null default '',
  to_id           text not null,
  to_name         text not null default '',
  to_username     text not null default '',
  status          text not null default 'pending',
  at              text,
  created_at      timestamptz not null default now()
);

create table if not exists public.cheers (
  id          text primary key,
  from_id     text not null,
  from_name   text not null default '',
  to_id       text not null,
  text        text not null default '',
  at          text,
  created_at  timestamptz not null default now()
);

create table if not exists public.announcements (
  id          text primary key,
  text        text not null default '',
  at          text,
  created_at  timestamptz not null default now()
);

create table if not exists public.settings (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create index if not exists friends_from_idx on public.friends (from_id);
create index if not exists friends_to_idx   on public.friends (to_id);
create index if not exists cheers_to_idx    on public.cheers (to_id);

-- ===========================================================================
--  ROW LEVEL SECURITY
-- ===========================================================================

alter table public.projects        enable row level security;
alter table public.lists           enable row level security;
alter table public.tasks           enable row level security;
alter table public.inventory       enable row level security;
alter table public.focus_logs      enable row level security;
alter table public.profiles        enable row level security;
alter table public.reward_units    enable row level security;
alter table public.reward_requests enable row level security;
alter table public.store_items     enable row level security;
alter table public.friends         enable row level security;
alter table public.cheers          enable row level security;
alter table public.announcements   enable row level security;
alter table public.settings        enable row level security;

-- ---- Private tables: the owner owns every row -----------------------------
create policy "projects_own" on public.projects
  for all to authenticated
  using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

create policy "lists_own" on public.lists
  for all to authenticated
  using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

create policy "tasks_own" on public.tasks
  for all to authenticated
  using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

create policy "inventory_own" on public.inventory
  for all to authenticated
  using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

create policy "focus_logs_own" on public.focus_logs
  for all to authenticated
  using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

-- ---- profiles: everyone reads (leaderboard), you write only your own row ---
create policy "profiles_read" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = auth.uid()::text);

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid()::text) with check (id = auth.uid()::text);

create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ---- reward_units / store_items / announcements / settings: admin-only write
create policy "reward_units_read" on public.reward_units
  for select to authenticated using (true);
create policy "reward_units_admin" on public.reward_units
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "store_items_read" on public.store_items
  for select to authenticated using (true);
create policy "store_items_admin" on public.store_items
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "announcements_read" on public.announcements
  for select to authenticated using (true);
create policy "announcements_admin" on public.announcements
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "settings_read" on public.settings
  for select to authenticated using (true);
create policy "settings_admin" on public.settings
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ---- reward_requests: users propose, admin decides ------------------------
create policy "reward_requests_read" on public.reward_requests
  for select to authenticated using (true);
create policy "reward_requests_insert" on public.reward_requests
  for insert to authenticated with check (user_id = auth.uid()::text);
create policy "reward_requests_admin" on public.reward_requests
  for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy "reward_requests_admin_delete" on public.reward_requests
  for delete to authenticated using (public.is_super_admin());

-- ---- friends: participants only ------------------------------------------
create policy "friends_read" on public.friends
  for select to authenticated using (true);
create policy "friends_insert" on public.friends
  for insert to authenticated with check (from_id = auth.uid()::text);
create policy "friends_respond" on public.friends
  for update to authenticated
  using (to_id = auth.uid()::text or from_id = auth.uid()::text or public.is_super_admin())
  with check (to_id = auth.uid()::text or from_id = auth.uid()::text or public.is_super_admin());
create policy "friends_remove" on public.friends
  for delete to authenticated
  using (from_id = auth.uid()::text or to_id = auth.uid()::text or public.is_super_admin());

-- ---- cheers: read all, send as yourself ----------------------------------
create policy "cheers_read" on public.cheers
  for select to authenticated using (true);
create policy "cheers_insert" on public.cheers
  for insert to authenticated with check (from_id = auth.uid()::text);

-- ===========================================================================
--  STORAGE — public "media" bucket for avatars & covers
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 6291456, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 6291456,
      allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'];

create policy "media_read" on storage.objects
  for select using (bucket_id = 'media');

create policy "media_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===========================================================================
--  DONE. Add your project URL + anon key to `.env` as
--  VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY and the app switches from
--  LOCAL MODE to full cloud mode automatically.
-- ===========================================================================
