-- Allow parents to read basic teacher workspace identity through their children's Enrollments.
drop policy if exists teacher_workspaces_select on public.teacher_workspaces;
create policy teacher_workspaces_select on public.teacher_workspaces for select
using (
  owner_teacher_user_id = (select auth.uid())
  or public.is_platform_admin()
  or exists (
    select 1
    from public.enrollments e
    where e.workspace_id = teacher_workspaces.id
      and public.is_child_owner(e.student_id)
  )
);
