-- V7: background lesson reminder foundation.
-- Materializes in-app reminders automatically for scheduled lessons in the next 24h.
-- The parent-facing RPC remains available for on-demand/idempotent reconciliation.

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.materialize_lesson_reminder_internal(p_session_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path=public
as $$
declare
  v_student uuid;
  v_enrollment uuid;
  v_parent uuid;
  v_start timestamptz;
  v_timezone text;
  v_child_name text;
  v_row public.notifications;
begin
  select
    s.enrollment_id,
    e.student_id,
    s.scheduled_start_utc,
    tw.timezone
  into
    v_enrollment,
    v_student,
    v_start,
    v_timezone
  from public.sessions s
  join public.enrollments e on e.id=s.enrollment_id
  join public.teacher_workspaces tw on tw.id=s.workspace_id
  where s.id=p_session_id
    and s.status='SCHEDULED'
    and s.scheduled_start_utc>now()
    and s.scheduled_start_utc<=now()+interval '24 hours';

  if v_student is null or v_enrollment is null or v_start is null then
    return null;
  end if;

  v_parent:=public.notification_parent_for_child(v_student);
  if v_parent is null then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_parent::text||':'||p_session_id::text,0));

  select display_name into v_child_name
  from public.child_profiles
  where id=v_student;

  select * into v_row
  from public.notifications
  where user_id=v_parent
    and event_type='LESSON_REMINDER'
    and metadata->>'session_id'=p_session_id::text
  order by created_at desc
  limit 1;

  if v_row.id is not null then
    if coalesce(v_row.metadata->>'scheduled_start_utc','')<>v_start::text then
      update public.notifications
      set
        title='تذكير بحصة قادمة',
        body='لديك حصة قادمة للطفل '||coalesce(v_child_name,'الطفل')||' • الموعد حسب توقيت المعلم '||
          to_char(v_start at time zone coalesce(nullif(v_timezone,''),'Africa/Cairo'),'YYYY-MM-DD HH24:MI'),
        read_at=null,
        metadata=jsonb_build_object(
          'session_id',p_session_id,
          'student_id',v_student,
          'enrollment_id',v_enrollment,
          'scheduled_start_utc',v_start
        )
      where id=v_row.id
      returning * into v_row;
    end if;
    return v_row;
  end if;

  return public.create_notification(
    v_parent,
    'LESSON_REMINDER',
    'تذكير بحصة قادمة',
    'لديك حصة قادمة للطفل '||coalesce(v_child_name,'الطفل')||' • الموعد حسب توقيت المعلم '||
      to_char(v_start at time zone coalesce(nullif(v_timezone,''),'Africa/Cairo'),'YYYY-MM-DD HH24:MI'),
    jsonb_build_object(
      'session_id',p_session_id,
      'student_id',v_student,
      'enrollment_id',v_enrollment,
      'scheduled_start_utc',v_start
    )
  );
end;
$$;

create or replace function public.ensure_lesson_reminder(p_session_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path=public
as $$
declare
  v_student uuid;
  v_parent uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select e.student_id
  into v_student
  from public.sessions s
  join public.enrollments e on e.id=s.enrollment_id
  where s.id=p_session_id;

  if v_student is null then
    return null;
  end if;

  v_parent:=public.notification_parent_for_child(v_student);
  if v_parent is null or v_parent<>auth.uid() then
    raise exception 'parent_not_allowed' using errcode='42501';
  end if;

  return public.materialize_lesson_reminder_internal(p_session_id);
end;
$$;

create or replace function public.materialize_lesson_reminders()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_session record;
  v_created integer:=0;
begin
  for v_session in
    select s.id
    from public.sessions s
    join public.teacher_workspaces tw on tw.id=s.workspace_id
    where tw.status='active'
      and s.status='SCHEDULED'
      and s.scheduled_start_utc>now()
      and s.scheduled_start_utc<=now()+interval '24 hours'
    order by s.scheduled_start_utc
    for update skip locked
  loop
    if public.materialize_lesson_reminder_internal(v_session.id) is not null then
      v_created:=v_created+1;
    end if;
  end loop;
  return v_created;
end;
$$;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname='v7-lesson-reminders'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
  perform cron.schedule(
    'v7-lesson-reminders',
    '*/5 * * * *',
    'select public.materialize_lesson_reminders();'
  );
end;
$$;

revoke execute on function public.materialize_lesson_reminder_internal(uuid) from public,anon,authenticated;
revoke execute on function public.ensure_lesson_reminder(uuid) from public,anon;
revoke execute on function public.materialize_lesson_reminders() from public,anon,authenticated;
grant execute on function public.ensure_lesson_reminder(uuid) to authenticated;
