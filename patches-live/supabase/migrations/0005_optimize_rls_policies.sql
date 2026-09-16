-- RLS/query planning improvements reported by Supabase performance advisors.
-- Use init-plan friendly auth.uid() calls and index review creator lookups.

create index if not exists review_events_created_by_idx on public.review_events(created_by);

create or replace function public.is_child_parent(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.child_profiles cp
    where cp.id = p_child_id and cp.parent_id = (select auth.uid())
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
       and c.teacher_id = (select auth.uid())
       and c.is_active = true
  );
$$;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles for select
using (id = (select auth.uid()));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update
using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "children_select_family_or_teacher" on public.child_profiles;
create policy "children_select_family_or_teacher" on public.child_profiles for select
using (parent_id = (select auth.uid()) or public.is_child_teacher(id));

drop policy if exists "children_insert_parent" on public.child_profiles;
create policy "children_insert_parent" on public.child_profiles for insert
with check (parent_id = (select auth.uid()));

drop policy if exists "children_update_parent" on public.child_profiles;
create policy "children_update_parent" on public.child_profiles for update
using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));

drop policy if exists "children_delete_parent" on public.child_profiles;
create policy "children_delete_parent" on public.child_profiles for delete
using (parent_id = (select auth.uid()));

drop policy if exists "classes_teacher_all" on public.classes;
create policy "classes_teacher_all" on public.classes for all
using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));

drop policy if exists "class_students_select_related" on public.class_students;
create policy "class_students_select_related" on public.class_students for select
using (
  exists(select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid()))
  or public.is_child_parent(child_id)
);

drop policy if exists "class_students_teacher_insert" on public.class_students;
create policy "class_students_teacher_insert" on public.class_students for insert
with check (exists(select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid())));

drop policy if exists "class_students_teacher_delete" on public.class_students;
create policy "class_students_teacher_delete" on public.class_students for delete
using (exists(select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid())));

drop policy if exists "review_events_insert_related" on public.review_events;
create policy "review_events_insert_related" on public.review_events for insert
with check (
  (public.is_child_parent(child_id) or public.is_child_teacher(child_id))
  and created_by = (select auth.uid())
);
