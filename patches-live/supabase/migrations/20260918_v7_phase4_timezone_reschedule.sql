-- V7 Phase 4 timezone-safe manual rescheduling.
-- The teacher enters local date/time; PostgreSQL resolves it with Teacher Workspace timezone.

create or replace function public.reschedule_session_local(
  p_session_id uuid,
  p_local_date date,
  p_local_start_time time without time zone,
  p_teacher_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_session public.sessions;
  v_workspace public.teacher_workspaces;
  v_new_start timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_local_date is null or p_local_start_time is null then raise exception 'local_reschedule_time_required'; end if;

  select * into v_session
  from public.sessions
  where id=p_session_id;

  if v_session.id is null then raise exception 'session_not_found'; end if;
  if not public.owns_teacher_workspace(v_session.workspace_id) then
    raise exception 'teacher_not_allowed' using errcode='42501';
  end if;

  select * into v_workspace
  from public.teacher_workspaces
  where id=v_session.workspace_id;

  if v_workspace.id is null then raise exception 'workspace_not_found'; end if;
  if not exists(select 1 from pg_timezone_names where name=v_workspace.timezone) then
    raise exception 'invalid_workspace_timezone';
  end if;

  v_new_start := (p_local_date + p_local_start_time) at time zone v_workspace.timezone;

  return public.reschedule_session(v_session.id,v_new_start,p_teacher_note);
end;
$$;

revoke execute on function public.reschedule_session_local(uuid,date,time without time zone,text) from public,anon;
grant execute on function public.reschedule_session_local(uuid,date,time without time zone,text) to authenticated;
