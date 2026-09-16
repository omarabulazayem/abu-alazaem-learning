-- Abu Al-Azaem Learning Platform - Supabase core schema
-- Parent accounts own one or more child profiles. Teachers are independent users.
-- The browser/server use a publishable key + the signed-in user's JWT. RLS is the
-- authorization boundary. Sensitive rewards are issued only through a validated RPC.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  account_type text not null default 'parent' check (account_type in ('parent','teacher','admin')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  age_band text not null default '7-9' check (age_band in ('3-6','7-9','10-12')),
  avatar text not null default '🧒🏻',
  level text not null default 'مجتهد',
  points integer not null default 0 check (points >= 0),
  stars integer not null default 0 check (stars >= 0),
  streak integer not null default 0 check (streak >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists child_profiles_parent_idx on public.child_profiles(parent_id);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  join_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists classes_teacher_idx on public.classes(teacher_id);

create table if not exists public.class_students (
  class_id uuid not null references public.classes(id) on delete cascade,
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, child_id)
);
create index if not exists class_students_child_idx on public.class_students(child_id);

create table if not exists public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  surah_number integer not null check (surah_number between 1 and 114),
  surah_name text not null,
  memorized_percent integer not null default 0 check (memorized_percent between 0 and 100),
  review_percent integer not null default 0 check (review_percent between 0 and 100),
  status text not null default 'new' check (status in ('new','learning','review','mastered')),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(child_id, surah_number)
);
create index if not exists learning_progress_child_idx on public.learning_progress(child_id);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  slug text not null,
  unlocked_at timestamptz not null default now(),
  unique(child_id, slug)
);

create table if not exists public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  source_type text not null,
  source_key text not null,
  points integer not null default 0 check (points >= 0),
  stars integer not null default 0 check (stars >= 0),
  created_at timestamptz not null default now(),
  unique(child_id, source_type, source_key)
);
create index if not exists reward_ledger_child_idx on public.reward_ledger(child_id);

create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  surah_number integer not null check (surah_number between 1 and 114),
  score integer check (score between 0 and 100),
  notes text,
  reviewed_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);
create index if not exists review_events_child_idx on public.review_events(child_id, reviewed_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists child_profiles_set_updated_at on public.child_profiles;
create trigger child_profiles_set_updated_at before update on public.child_profiles
for each row execute function public.set_updated_at();
drop trigger if exists classes_set_updated_at on public.classes;
create trigger classes_set_updated_at before update on public.classes
for each row execute function public.set_updated_at();
drop trigger if exists learning_progress_set_updated_at on public.learning_progress;
create trigger learning_progress_set_updated_at before update on public.learning_progress
for each row execute function public.set_updated_at();

create or replace function public.apply_reward_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.child_profiles
     set points = points + new.points,
         stars = stars + new.stars
   where id = new.child_id;
  return new;
end;
$$;
drop trigger if exists reward_ledger_apply on public.reward_ledger;
create trigger reward_ledger_apply
after insert on public.reward_ledger
for each row execute function public.apply_reward_ledger();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_type text;
  v_display_name text;
  v_child_name text;
  v_child_age_band text;
begin
  v_account_type := coalesce(new.raw_user_meta_data->>'account_type', 'parent');
  if v_account_type not in ('parent','teacher') then
    v_account_type := 'parent';
  end if;

  v_display_name := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'مستخدم'
  );

  insert into public.profiles(id, display_name, account_type)
  values (new.id, v_display_name, v_account_type)
  on conflict (id) do update
    set display_name = excluded.display_name;

  if v_account_type = 'parent' then
    v_child_name := nullif(new.raw_user_meta_data->>'child_name', '');
    v_child_age_band := coalesce(nullif(new.raw_user_meta_data->>'child_age_band', ''), '7-9');
    if v_child_age_band not in ('3-6','7-9','10-12') then
      v_child_age_band := '7-9';
    end if;

    if v_child_name is not null and not exists (
      select 1 from public.child_profiles where parent_id = new.id
    ) then
      insert into public.child_profiles(parent_id, display_name, age_band)
      values (new.id, v_child_name, v_child_age_band);
    end if;
  end if;

  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles(id, display_name, account_type)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'display_name', ''), split_part(coalesce(u.email, ''), '@', 1), 'مستخدم'),
  case when coalesce(u.raw_user_meta_data->>'account_type', 'parent') = 'teacher' then 'teacher' else 'parent' end
from auth.users u
on conflict (id) do nothing;

create or replace function public.is_child_parent(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.child_profiles cp
    where cp.id = p_child_id and cp.parent_id = auth.uid()
  );
$$;

create or replace function public.is_child_teacher(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
      from public.class_students cs
      join public.classes c on c.id = cs.class_id
     where cs.child_id = p_child_id
       and c.teacher_id = auth.uid()
       and c.is_active = true
  );
$$;

create or replace function public.link_child_to_class(p_child_id uuid, p_join_code text)
returns table(class_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid;
begin
  if auth.uid() is null or not public.is_child_parent(p_child_id) then
    raise exception 'Not allowed to link this child' using errcode = '42501';
  end if;

  select c.id into v_class_id
  from public.classes c
  where c.join_code = upper(trim(p_join_code))
    and c.is_active = true
  limit 1;

  if v_class_id is null then
    raise exception 'Class code was not found';
  end if;

  insert into public.class_students(class_id, child_id)
  values (v_class_id, p_child_id)
  on conflict do nothing;

  return query select v_class_id;
end;
$$;

create or replace function public.claim_learning_reward(
  p_child_id uuid,
  p_event text,
  p_source_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
  v_stars integer;
  v_inserted integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if public.is_child_parent(p_child_id) then
    null;
  elsif p_event = 'review_session' and public.is_child_teacher(p_child_id) then
    null;
  else
    raise exception 'Not allowed to reward this child' using errcode = '42501';
  end if;

  case p_event
    when 'memorize_session' then v_points := 20; v_stars := 1;
    when 'memory_game' then v_points := 35; v_stars := 2;
    when 'review_session' then v_points := 15; v_stars := 1;
    else raise exception 'Unknown reward event';
  end case;

  if length(trim(coalesce(p_source_key, ''))) < 4 then
    raise exception 'Invalid reward source key';
  end if;

  insert into public.reward_ledger(child_id, source_type, source_key, points, stars)
  values (p_child_id, p_event, p_source_key, v_points, v_stars)
  on conflict (child_id, source_type, source_key) do nothing;
  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'awarded', v_inserted = 1,
    'points', case when v_inserted = 1 then v_points else 0 end,
    'stars', case when v_inserted = 1 then v_stars else 0 end
  );
end;
$$;

revoke all on public.profiles from anon, authenticated;
revoke all on public.child_profiles from anon, authenticated;
revoke all on public.classes from anon, authenticated;
revoke all on public.class_students from anon, authenticated;
revoke all on public.learning_progress from anon, authenticated;
revoke all on public.achievements from anon, authenticated;
revoke all on public.reward_ledger from anon, authenticated;
revoke all on public.review_events from anon, authenticated;

grant select on public.profiles to authenticated;
grant update(display_name, avatar_url) on public.profiles to authenticated;

grant select on public.child_profiles to authenticated;
grant insert(parent_id, display_name, age_band, avatar) on public.child_profiles to authenticated;
grant update(display_name, age_band, avatar, is_active) on public.child_profiles to authenticated;
grant delete on public.child_profiles to authenticated;

grant select on public.classes to authenticated;
grant insert(teacher_id, name, join_code) on public.classes to authenticated;
grant update(name, is_active) on public.classes to authenticated;
grant delete on public.classes to authenticated;

grant select, insert, delete on public.class_students to authenticated;

grant select on public.learning_progress to authenticated;
grant insert(child_id, surah_number, surah_name, memorized_percent, review_percent, status, last_activity_at)
  on public.learning_progress to authenticated;
grant update(surah_name, memorized_percent, review_percent, status, last_activity_at)
  on public.learning_progress to authenticated;

grant select on public.achievements to authenticated;
grant select on public.reward_ledger to authenticated;
grant select on public.review_events to authenticated;
grant insert(child_id, surah_number, score, notes, reviewed_at, created_by)
  on public.review_events to authenticated;

revoke execute on function public.link_child_to_class(uuid, text) from public, anon;
revoke execute on function public.claim_learning_reward(uuid, text, text) from public, anon;
grant execute on function public.link_child_to_class(uuid, text) to authenticated;
grant execute on function public.claim_learning_reward(uuid, text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.child_profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_students enable row level security;
alter table public.learning_progress enable row level security;
alter table public.achievements enable row level security;
alter table public.reward_ledger enable row level security;
alter table public.review_events enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles for select
using (id = auth.uid());
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update
using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "children_select_family_or_teacher" on public.child_profiles;
create policy "children_select_family_or_teacher" on public.child_profiles for select
using (parent_id = auth.uid() or public.is_child_teacher(id));
drop policy if exists "children_insert_parent" on public.child_profiles;
create policy "children_insert_parent" on public.child_profiles for insert
with check (parent_id = auth.uid());
drop policy if exists "children_update_parent" on public.child_profiles;
create policy "children_update_parent" on public.child_profiles for update
using (parent_id = auth.uid()) with check (parent_id = auth.uid());
drop policy if exists "children_delete_parent" on public.child_profiles;
create policy "children_delete_parent" on public.child_profiles for delete
using (parent_id = auth.uid());

drop policy if exists "classes_teacher_all" on public.classes;
create policy "classes_teacher_all" on public.classes for all
using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists "class_students_select_related" on public.class_students;
create policy "class_students_select_related" on public.class_students for select
using (
  exists(select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  or public.is_child_parent(child_id)
);
drop policy if exists "class_students_teacher_insert" on public.class_students;
create policy "class_students_teacher_insert" on public.class_students for insert
with check (exists(select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));
drop policy if exists "class_students_teacher_delete" on public.class_students;
create policy "class_students_teacher_delete" on public.class_students for delete
using (exists(select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));

drop policy if exists "progress_select_related" on public.learning_progress;
create policy "progress_select_related" on public.learning_progress for select
using (public.is_child_parent(child_id) or public.is_child_teacher(child_id));
drop policy if exists "progress_insert_related" on public.learning_progress;
create policy "progress_insert_related" on public.learning_progress for insert
with check (public.is_child_parent(child_id) or public.is_child_teacher(child_id));
drop policy if exists "progress_update_related" on public.learning_progress;
create policy "progress_update_related" on public.learning_progress for update
using (public.is_child_parent(child_id) or public.is_child_teacher(child_id))
with check (public.is_child_parent(child_id) or public.is_child_teacher(child_id));

drop policy if exists "achievements_select_related" on public.achievements;
create policy "achievements_select_related" on public.achievements for select
using (public.is_child_parent(child_id) or public.is_child_teacher(child_id));

drop policy if exists "rewards_select_related" on public.reward_ledger;
create policy "rewards_select_related" on public.reward_ledger for select
using (public.is_child_parent(child_id) or public.is_child_teacher(child_id));

drop policy if exists "review_events_select_related" on public.review_events;
create policy "review_events_select_related" on public.review_events for select
using (public.is_child_parent(child_id) or public.is_child_teacher(child_id));
drop policy if exists "review_events_insert_related" on public.review_events;
create policy "review_events_insert_related" on public.review_events for insert
with check (
  (public.is_child_parent(child_id) or public.is_child_teacher(child_id))
  and created_by = auth.uid()
);
