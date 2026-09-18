-- V7 Phase 1 hardening after Supabase advisor review.

-- Trigger-only functions must never be callable as exposed RPCs.
revoke execute on function public.ensure_teacher_workspace() from public, anon, authenticated;
revoke execute on function public.ensure_child_owner_relation() from public, anon, authenticated;

-- family_security is RPC-only. Keep an explicit deny policy so direct table access
-- remains impossible even if grants change accidentally later.
drop policy if exists family_security_deny_direct on public.family_security;
create policy family_security_deny_direct
on public.family_security
for all
to authenticated
using (false)
with check (false);

-- Cover new foreign keys used for invite history/support queries.
create index if not exists enrollment_invites_invited_by_idx
  on public.enrollment_invites(invited_by);
create index if not exists enrollment_invites_accepted_by_idx
  on public.enrollment_invites(accepted_by)
  where accepted_by is not null;

-- Optimize RLS auth lookups by evaluating auth context once per statement.
drop policy if exists teacher_workspaces_select on public.teacher_workspaces;
create policy teacher_workspaces_select on public.teacher_workspaces for select
using (
  owner_teacher_user_id = (select auth.uid())
  or public.is_platform_admin()
);

drop policy if exists teacher_workspaces_update on public.teacher_workspaces;
create policy teacher_workspaces_update on public.teacher_workspaces for update
using (
  owner_teacher_user_id = (select auth.uid())
  or public.is_platform_admin()
)
with check (
  owner_teacher_user_id = (select auth.uid())
  or public.is_platform_admin()
);

drop policy if exists parent_student_relations_select on public.parent_student_relations;
create policy parent_student_relations_select on public.parent_student_relations for select
using (
  parent_user_id = (select auth.uid())
  or public.teacher_can_access_child(student_id, null)
  or public.is_platform_admin()
);

drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments for select
using (
  teacher_user_id = (select auth.uid())
  or public.is_child_owner(student_id)
  or public.is_platform_admin()
);

drop policy if exists enrollment_invites_select on public.enrollment_invites;
create policy enrollment_invites_select on public.enrollment_invites for select
using (
  invited_by = (select auth.uid())
  or lower(invited_email) = lower(coalesce((select auth.jwt()->>'email'),''))
  or public.is_platform_admin()
);

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs for select
using (
  actor_user_id = (select auth.uid())
  or public.is_platform_admin()
);
