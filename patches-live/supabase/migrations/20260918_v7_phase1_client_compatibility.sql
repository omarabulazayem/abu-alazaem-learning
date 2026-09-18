-- V7 Phase 1 client-flow compatibility.
-- Expand the existing teacher-child helper so current RLS policies work during
-- the transition from legacy class_students to V7 enrollments.

create or replace function public.is_child_teacher(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists(
      select 1
      from public.enrollments e
      join public.teacher_workspaces w on w.id = e.workspace_id
      where e.student_id = p_child_id
        and e.teacher_user_id = auth.uid()
        and w.owner_teacher_user_id = auth.uid()
        and e.status in ('active','paused')
        and w.status <> 'closed'
    )
    or exists(
      select 1
      from public.class_students cs
      join public.classes c on c.id = cs.class_id
      where cs.child_id = p_child_id
        and c.teacher_id = auth.uid()
        and c.is_active = true
    );
$$;

revoke execute on function public.is_child_teacher(uuid) from public, anon;
grant execute on function public.is_child_teacher(uuid) to authenticated;

create or replace function public.has_child_mode_pin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.family_security s
    where s.parent_user_id = auth.uid()
  );
$$;

revoke execute on function public.has_child_mode_pin() from public, anon;
grant execute on function public.has_child_mode_pin() to authenticated;
