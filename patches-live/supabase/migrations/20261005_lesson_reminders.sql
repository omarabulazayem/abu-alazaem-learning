-- V7: lesson reminder foundation.
-- Creates an in-app reminder for an upcoming family lesson when the parent
-- visits the family workspace. The operation is idempotent per session.

create or replace function public.ensure_lesson_reminder(p_session_id uuid)
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
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

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
    and e.student_id is not null;

  if v_student is null or v_enrollment is null or v_start is null then
    return null;
  end if;

  v_parent:=public.notification_parent_for_child(v_student);
  if v_parent is null or v_parent<>auth.uid() then
    raise exception 'parent_not_allowed' using errcode='42501';
  end if;

  -- Serialize reminder creation per parent/session so two devices cannot race into duplicates.
  perform pg_advisory_xact_lock(hashtextextended(v_parent::text||':'||p_session_id::text,0));

  if not exists (
    select 1
    from public.sessions s
    where s.id=p_session_id
      and s.status='SCHEDULED'
      and s.scheduled_start_utc>now()
      and s.scheduled_start_utc<=now()+interval '24 hours'
  ) then
    return null;
  end if;

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

revoke all on function public.ensure_lesson_reminder(uuid) from public,anon;
grant execute on function public.ensure_lesson_reminder(uuid) to authenticated;
