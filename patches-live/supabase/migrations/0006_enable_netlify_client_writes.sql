grant insert, update on table public.child_profiles to authenticated;
grant insert, update on table public.classes to authenticated;
grant insert, update on table public.learning_progress to authenticated;
grant insert on table public.review_events to authenticated;

drop policy if exists children_insert_parent on public.child_profiles;
create policy children_insert_parent on public.child_profiles
for insert to authenticated
with check (
  parent_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.account_type in ('parent','admin')
  )
);

drop policy if exists children_update_parent on public.child_profiles;
create policy children_update_parent on public.child_profiles
for update to authenticated
using (
  parent_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.account_type in ('parent','admin')
  )
)
with check (
  parent_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.account_type in ('parent','admin')
  )
);

drop policy if exists children_delete_parent on public.child_profiles;
create policy children_delete_parent on public.child_profiles
for delete to authenticated
using (
  parent_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.account_type in ('parent','admin')
  )
);

drop policy if exists classes_teacher_all on public.classes;
create policy classes_teacher_all on public.classes
for all to authenticated
using (
  teacher_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.account_type in ('teacher','admin')
  )
)
with check (
  teacher_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.account_type in ('teacher','admin')
  )
);
