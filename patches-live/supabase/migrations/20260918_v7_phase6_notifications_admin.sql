-- V7 Phase 6: notification events/delivery outbox + operational Super Admin.
-- Event and channel delivery are deliberately separated so future WhatsApp can be added
-- without changing business event generation.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references public.profiles(id) on delete cascade,
  recipient_email text,
  event_type text not null,
  title text not null,
  body text not null,
  action_path text,
  entity_type text,
  entity_id uuid,
  dedupe_key text unique,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (recipient_user_id is not null or recipient_email is not null)
);
create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_user_id,created_at desc)
  where recipient_user_id is not null;
create index if not exists notifications_recipient_unread_idx
  on public.notifications(recipient_user_id,created_at desc)
  where recipient_user_id is not null and read_at is null;
create index if not exists notifications_event_idx
  on public.notifications(event_type,created_at desc);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel text not null check (channel in ('IN_APP','EMAIL')),
  destination text,
  status text not null check (status in ('PENDING','SENT','FAILED','SKIPPED')),
  provider_reference text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  sent_at timestamptz,
  error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(notification_id,channel)
);
create index if not exists notification_deliveries_pending_idx
  on public.notification_deliveries(channel,status,created_at)
  where status='PENDING';
create index if not exists notification_deliveries_notification_idx
  on public.notification_deliveries(notification_id);

drop trigger if exists notification_deliveries_set_updated_at on public.notification_deliveries;
create trigger notification_deliveries_set_updated_at
before update on public.notification_deliveries
for each row execute function public.set_updated_at();

create or replace function public.emit_notification(
  p_recipient_user_id uuid,
  p_recipient_email text,
  p_event_type text,
  p_title text,
  p_body text,
  p_action_path text default null,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_dedupe_key text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_email_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_email text:=lower(nullif(trim(coalesce(p_recipient_email,'')),''));
  v_notification_id uuid;
begin
  if p_recipient_user_id is null and v_email is null then
    return null;
  end if;

  if v_email is null and p_recipient_user_id is not null then
    select lower(u.email) into v_email
    from auth.users u
    where u.id=p_recipient_user_id;
  end if;

  insert into public.notifications(
    recipient_user_id,recipient_email,event_type,title,body,action_path,
    entity_type,entity_id,dedupe_key,metadata
  ) values(
    p_recipient_user_id,v_email,p_event_type,trim(p_title),trim(p_body),p_action_path,
    p_entity_type,p_entity_id,p_dedupe_key,coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict(dedupe_key) where dedupe_key is not null do nothing
  returning id into v_notification_id;

  if v_notification_id is null and p_dedupe_key is not null then
    select id into v_notification_id
    from public.notifications
    where dedupe_key=p_dedupe_key;
    return v_notification_id;
  end if;

  if p_recipient_user_id is not null then
    insert into public.notification_deliveries(
      notification_id,channel,destination,status,sent_at,payload
    ) values(
      v_notification_id,'IN_APP',p_recipient_user_id::text,'SENT',now(),'{}'::jsonb
    )
    on conflict(notification_id,channel) do nothing;
  end if;

  if v_email is not null then
    insert into public.notification_deliveries(
      notification_id,channel,destination,status,payload
    ) values(
      v_notification_id,'EMAIL',v_email,'PENDING',coalesce(p_email_payload,'{}'::jsonb)
    )
    on conflict(notification_id,channel) do nothing;
  end if;

  return v_notification_id;
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;

  update public.notifications
  set read_at=coalesce(read_at,now())
  where id=p_notification_id
    and recipient_user_id=auth.uid();

  return found;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;

  update public.notifications
  set read_at=now()
  where recipient_user_id=auth.uid()
    and read_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.notify_task_assignment_created()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_task public.tasks;
  v_parent record;
begin
  select * into v_task from public.tasks where id=new.task_id;

  for v_parent in
    select r.parent_user_id
    from public.parent_student_relations r
    where r.student_id=new.student_id
  loop
    perform public.emit_notification(
      v_parent.parent_user_id,null,'new_task','مهمة جديدة',
      coalesce(v_task.title,'لديك مهمة جديدة للطفل.'),
      '/family','task_assignment',new.id,
      'new-task:'||new.id::text||':'||v_parent.parent_user_id::text,
      jsonb_build_object('student_id',new.student_id,'due_at',new.due_at,'points',v_task.points_reward),
      '{}'::jsonb
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists task_assignments_notify_created on public.task_assignments;
create trigger task_assignments_notify_created
after insert on public.task_assignments
for each row execute function public.notify_task_assignment_created();

create or replace function public.notify_task_submission_created()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_assignment public.task_assignments;
  v_task public.tasks;
  v_enrollment public.enrollments;
begin
  select * into v_assignment from public.task_assignments where id=new.assignment_id;
  select * into v_task from public.tasks where id=v_assignment.task_id;
  select * into v_enrollment from public.enrollments where id=v_assignment.enrollment_id;

  if v_enrollment.teacher_user_id is not null then
    perform public.emit_notification(
      v_enrollment.teacher_user_id,null,'task_submitted','مهمة بانتظار المراجعة',
      coalesce(v_task.title,'تم إرسال مهمة للمراجعة.'),
      '/teacher/tasks','task_submission',new.id,
      'task-submitted:'||new.id::text||':'||v_enrollment.teacher_user_id::text,
      jsonb_build_object('assignment_id',new.assignment_id,'student_id',v_assignment.student_id),
      '{}'::jsonb
    );
  end if;
  return new;
end;
$$;

drop trigger if exists task_submissions_notify_created on public.task_submissions;
create trigger task_submissions_notify_created
after insert on public.task_submissions
for each row execute function public.notify_task_submission_created();

create or replace function public.notify_task_submission_decision()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_assignment public.task_assignments;
  v_task public.tasks;
  v_parent record;
  v_event text;
  v_title text;
  v_body text;
begin
  if old.decision=new.decision or new.decision not in ('approved','rejected') then return new; end if;

  select * into v_assignment from public.task_assignments where id=new.assignment_id;
  select * into v_task from public.tasks where id=v_assignment.task_id;

  v_event:=case when new.decision='approved' then 'task_approved' else 'task_rejected' end;
  v_title:=case when new.decision='approved' then 'تم اعتماد المهمة' else 'المهمة تحتاج مراجعة' end;
  v_body:=case when new.decision='approved'
    then coalesce(v_task.title,'تم اعتماد المهمة وإضافة النقاط.')
    else coalesce(new.rejection_note,'راجع ملاحظة المعلم وأعد الإرسال.')
  end;

  for v_parent in
    select r.parent_user_id
    from public.parent_student_relations r
    where r.student_id=v_assignment.student_id
  loop
    perform public.emit_notification(
      v_parent.parent_user_id,null,v_event,v_title,v_body,
      '/family','task_submission',new.id,
      v_event||':'||new.id::text||':'||v_parent.parent_user_id::text,
      jsonb_build_object('assignment_id',new.assignment_id,'student_id',v_assignment.student_id),
      '{}'::jsonb
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists task_submissions_notify_decision on public.task_submissions;
create trigger task_submissions_notify_decision
after update of decision on public.task_submissions
for each row execute function public.notify_task_submission_decision();

create or replace function public.notify_rescheduled_session_created()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_enrollment public.enrollments;
  v_parent record;
begin
  if new.rescheduled_from_session_id is null then return new; end if;
  select * into v_enrollment from public.enrollments where id=new.enrollment_id;

  for v_parent in
    select r.parent_user_id from public.parent_student_relations r
    where r.student_id=v_enrollment.student_id
  loop
    perform public.emit_notification(
      v_parent.parent_user_id,null,'lesson_rescheduled','تم تغيير موعد الحصة',
      'تم تحديد موعد جديد للحصة. افتح الجدول لمراجعة الوقت.',
      '/family','session',new.id,
      'lesson-rescheduled:'||new.id::text||':'||v_parent.parent_user_id::text,
      jsonb_build_object('scheduled_start_utc',new.scheduled_start_utc,'workspace_id',new.workspace_id),
      '{}'::jsonb
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists sessions_notify_rescheduled_insert on public.sessions;
create trigger sessions_notify_rescheduled_insert
after insert on public.sessions
for each row execute function public.notify_rescheduled_session_created();

create or replace function public.notify_session_status_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_enrollment public.enrollments;
  v_parent record;
begin
  if old.status=new.status then return new; end if;
  if new.status not in ('EARLY_CANCELLATION','LATE_CANCELLATION','CANCELLED') then return new; end if;

  select * into v_enrollment from public.enrollments where id=new.enrollment_id;

  if new.cancellation_actor='PARENT' then
    perform public.emit_notification(
      v_enrollment.teacher_user_id,null,'lesson_cancelled','تم إلغاء حصة',
      'ولي الأمر ألغى الحصة. راجع الجدول لمعرفة حالة الإلغاء.',
      '/teacher/schedule','session',new.id,
      'lesson-cancelled:'||new.id::text||':teacher:'||v_enrollment.teacher_user_id::text,
      jsonb_build_object('status',new.status,'student_id',v_enrollment.student_id),
      '{}'::jsonb
    );
  else
    for v_parent in
      select r.parent_user_id from public.parent_student_relations r
      where r.student_id=v_enrollment.student_id
    loop
      perform public.emit_notification(
        v_parent.parent_user_id,null,'lesson_cancelled','تم إلغاء الحصة',
        'تم إلغاء الحصة. افتح الجدول لمعرفة التفاصيل.',
        '/family','session',new.id,
        'lesson-cancelled:'||new.id::text||':'||v_parent.parent_user_id::text,
        jsonb_build_object('status',new.status,'cancellation_actor',new.cancellation_actor),
        '{}'::jsonb
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists sessions_notify_status_change on public.sessions;
create trigger sessions_notify_status_change
after update of status on public.sessions
for each row execute function public.notify_session_status_change();

create or replace function public.notify_billing_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_parent record;
  v_enrollment public.enrollments;
  v_event text;
begin
  if tg_op='UPDATE' and old.status=new.status then return new; end if;

  select * into v_enrollment from public.enrollments where id=new.enrollment_id;
  v_event:='tuition_status_change';

  for v_parent in
    select r.parent_user_id from public.parent_student_relations r
    where r.student_id=v_enrollment.student_id
  loop
    perform public.emit_notification(
      v_parent.parent_user_id,null,v_event,'تحديث في كشف الاستحقاقات',
      case new.status
        when 'DUE' then 'تمت إضافة استحقاق جديد إلى كشف الحصص.'
        when 'PAID' then 'تم تسجيل الاستحقاق كمدفوع.'
        when 'WAIVED' then 'تم إعفاء الاستحقاق بواسطة المعلم.'
        else 'تم تحديث حالة الاستحقاق.'
      end,
      '/family','session_billing_entry',new.id,
      'tuition:'||new.id::text||':'||new.status||':'||v_parent.parent_user_id::text,
      jsonb_build_object('status',new.status,'amount',new.amount,'session_id',new.session_id),
      '{}'::jsonb
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists session_billing_notify_insert on public.session_billing_entries;
create trigger session_billing_notify_insert
after insert on public.session_billing_entries
for each row execute function public.notify_billing_change();

drop trigger if exists session_billing_notify_update on public.session_billing_entries;
create trigger session_billing_notify_update
after update of status on public.session_billing_entries
for each row execute function public.notify_billing_change();

create or replace function public.notify_point_reversal()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_parent record;
begin
  if new.transaction_type<>'POINT_REVERSAL' then return new; end if;

  for v_parent in
    select r.parent_user_id from public.parent_student_relations r
    where r.student_id=new.student_id
  loop
    perform public.emit_notification(
      v_parent.parent_user_id,null,'points_reversed','تم تصحيح نقاط',
      coalesce(new.reason,'تم تسجيل عملية سحب نقاط موثقة.'),
      '/family','point_ledger',new.id,
      'points-reversed:'||new.id::text||':'||v_parent.parent_user_id::text,
      jsonb_build_object('wallet_delta',new.wallet_delta,'lifetime_delta',new.lifetime_delta,'weekly_delta',new.weekly_delta),
      '{}'::jsonb
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists point_ledger_notify_reversal on public.point_ledger;
create trigger point_ledger_notify_reversal
after insert on public.point_ledger
for each row execute function public.notify_point_reversal();

create or replace function public.notify_leaderboard_closed()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_snapshot public.leaderboard_snapshots;
  v_parent record;
begin
  if old.status=new.status or new.status<>'CLOSED' then return new; end if;

  for v_snapshot in
    select * from public.leaderboard_snapshots
    where leaderboard_week_id=new.id
  loop
    for v_parent in
      select r.parent_user_id from public.parent_student_relations r
      where r.student_id=v_snapshot.student_id
    loop
      perform public.emit_notification(
        v_parent.parent_user_id,null,'weekly_result','نتيجة الأسبوع جاهزة',
        'المركز #'||v_snapshot.rank::text||
          case when v_snapshot.reward_points>0 then ' • جائزة '||v_snapshot.reward_points::text||' نقطة' else '' end,
        '/leaderboard','leaderboard_week',new.id,
        'weekly-result:'||new.id::text||':'||v_snapshot.student_id::text||':'||v_parent.parent_user_id::text,
        jsonb_build_object('student_id',v_snapshot.student_id,'rank',v_snapshot.rank,'score',v_snapshot.final_score,'reward_points',v_snapshot.reward_points),
        '{}'::jsonb
      );
    end loop;
  end loop;
  return new;
end;
$$;

drop trigger if exists leaderboard_weeks_notify_closed on public.leaderboard_weeks;
create trigger leaderboard_weeks_notify_closed
after update of status on public.leaderboard_weeks
for each row execute function public.notify_leaderboard_closed();

create or replace function public.enqueue_lesson_reminders()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_session public.sessions;
  v_enrollment public.enrollments;
  v_parent record;
  v_count integer:=0;
  v_id uuid;
begin
  for v_session in
    select *
    from public.sessions
    where status='SCHEDULED'
      and scheduled_start_utc>=now()+interval '23 hours 45 minutes'
      and scheduled_start_utc<now()+interval '24 hours 15 minutes'
  loop
    select * into v_enrollment from public.enrollments where id=v_session.enrollment_id;

    for v_parent in
      select r.parent_user_id from public.parent_student_relations r
      where r.student_id=v_enrollment.student_id
    loop
      v_id:=public.emit_notification(
        v_parent.parent_user_id,null,'lesson_reminder','تذكير بحصة غدًا',
        'موعد الحصة خلال حوالي 24 ساعة.',
        '/family','session',v_session.id,
        'lesson-reminder-24h:'||v_session.id::text||':'||v_parent.parent_user_id::text,
        jsonb_build_object('scheduled_start_utc',v_session.scheduled_start_utc),
        '{}'::jsonb
      );
      if v_id is not null then v_count:=v_count+1; end if;
    end loop;

    v_id:=public.emit_notification(
      v_enrollment.teacher_user_id,null,'lesson_reminder','تذكير بحصة غدًا',
      'لديك حصة خلال حوالي 24 ساعة.',
      '/teacher/schedule','session',v_session.id,
      'lesson-reminder-24h:'||v_session.id::text||':teacher:'||v_enrollment.teacher_user_id::text,
      jsonb_build_object('scheduled_start_utc',v_session.scheduled_start_utc,'student_id',v_enrollment.student_id),
      '{}'::jsonb
    );
    if v_id is not null then v_count:=v_count+1; end if;
  end loop;

  return v_count;
end;
$$;

-- Replace invite creation so invite event and EMAIL outbox are created at the same moment
-- while the plaintext token is still available.
create or replace function public.create_enrollment_invite(
  p_parent_email text,
  p_session_rate numeric default 0,
  p_expires_hours integer default 168
)
returns table(invite_id uuid, invite_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public,auth
as $$
declare
  v_workspace public.teacher_workspaces;
  v_token text;
  v_invite public.enrollment_invites;
  v_parent_user_id uuid;
  v_email text:=lower(trim(coalesce(p_parent_email,'')));
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if length(v_email)<5 or position('@' in v_email)=0 then raise exception 'invalid_email'; end if;
  if coalesce(p_session_rate,0)<0 then raise exception 'invalid_session_rate'; end if;
  if coalesce(p_expires_hours,168)<1 or p_expires_hours>720 then raise exception 'invalid_expiry'; end if;

  select * into v_workspace
  from public.teacher_workspaces
  where owner_teacher_user_id=auth.uid() and status='active'
  limit 1;

  if v_workspace.id is null then raise exception 'teacher_workspace_not_found' using errcode='42501'; end if;

  v_token:=encode(extensions.gen_random_bytes(32),'hex');

  insert into public.enrollment_invites(
    workspace_id,invited_email,invited_by,session_rate,token_hash,expires_at
  ) values(
    v_workspace.id,v_email,auth.uid(),coalesce(p_session_rate,0),
    encode(extensions.digest(v_token,'sha256'),'hex'),
    now()+make_interval(hours=>coalesce(p_expires_hours,168))
  )
  returning * into v_invite;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_state)
  values(
    auth.uid(),'ENROLLMENT_INVITE_CREATED','enrollment_invite',v_invite.id,
    jsonb_build_object('workspace_id',v_invite.workspace_id,'invited_email',v_invite.invited_email,'session_rate',v_invite.session_rate,'expires_at',v_invite.expires_at)
  );

  select u.id into v_parent_user_id
  from auth.users u
  where lower(u.email)=v_email
  limit 1;

  perform public.emit_notification(
    v_parent_user_id,v_email,'parent_invite','دعوة للانضمام إلى معلم',
    'لديك دعوة لربط ملف طفل بمساحة المعلم '||coalesce(v_workspace.display_name,'المعلم')||'.',
    '/family?invite='||v_token,'enrollment_invite',v_invite.id,
    'parent-invite:'||v_invite.id::text||':'||v_email,
    jsonb_build_object('workspace_id',v_workspace.id,'expires_at',v_invite.expires_at),
    jsonb_build_object('action_path','/family?invite='||v_token,'expires_at',v_invite.expires_at)
  );

  return query select v_invite.id,v_token,v_invite.expires_at;
end;
$$;

create or replace function public.admin_teacher_overview()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_rows jsonb;
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode='42501'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'workspace_id',w.id,
    'teacher_user_id',w.owner_teacher_user_id,
    'display_name',w.display_name,
    'teacher_name',p.display_name,
    'email',u.email,
    'timezone',w.timezone,
    'status',w.status,
    'created_at',w.created_at
  ) order by w.created_at desc),'[]'::jsonb)
  into v_rows
  from public.teacher_workspaces w
  join public.profiles p on p.id=w.owner_teacher_user_id
  left join auth.users u on u.id=w.owner_teacher_user_id;

  return v_rows;
end;
$$;

create or replace function public.admin_set_teacher_workspace_status(
  p_workspace_id uuid,
  p_status text,
  p_reason text
)
returns public.teacher_workspaces
language plpgsql
security definer
set search_path=public
as $$
declare
  v_workspace public.teacher_workspaces;
  v_before jsonb;
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if p_status not in ('active','paused','suspended','closed') then raise exception 'invalid_workspace_status'; end if;
  if char_length(trim(coalesce(p_reason,'')))<3 then raise exception 'admin_reason_required'; end if;

  select * into v_workspace
  from public.teacher_workspaces
  where id=p_workspace_id
  for update;

  if v_workspace.id is null then raise exception 'workspace_not_found'; end if;
  v_before:=to_jsonb(v_workspace);

  update public.teacher_workspaces
  set status=p_status
  where id=v_workspace.id
  returning * into v_workspace;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_state,after_state,reason)
  values(auth.uid(),'ADMIN_TEACHER_STATUS_CHANGED','teacher_workspace',v_workspace.id,v_before,to_jsonb(v_workspace),trim(p_reason));

  perform public.emit_notification(
    v_workspace.owner_teacher_user_id,null,'teacher_account_status','تحديث حالة حساب المعلم',
    'تم تحديث حالة مساحة المعلم إلى: '||p_status||'.',
    '/teacher','teacher_workspace',v_workspace.id,
    'teacher-status:'||v_workspace.id::text||':'||p_status||':'||extract(epoch from now())::bigint::text,
    jsonb_build_object('status',p_status,'reason',trim(p_reason)),
    '{}'::jsonb
  );

  return v_workspace;
end;
$$;

revoke all on public.notifications from anon,authenticated;
revoke all on public.notification_deliveries from anon,authenticated;
grant select on public.notifications to authenticated;
grant select on public.notification_deliveries to authenticated;

revoke execute on function public.emit_notification(uuid,text,text,text,text,text,text,uuid,text,jsonb,jsonb) from public,anon,authenticated;
revoke execute on function public.mark_notification_read(uuid) from public,anon;
revoke execute on function public.mark_all_notifications_read() from public,anon;
revoke execute on function public.notify_task_assignment_created() from public,anon,authenticated;
revoke execute on function public.notify_task_submission_created() from public,anon,authenticated;
revoke execute on function public.notify_task_submission_decision() from public,anon,authenticated;
revoke execute on function public.notify_rescheduled_session_created() from public,anon,authenticated;
revoke execute on function public.notify_session_status_change() from public,anon,authenticated;
revoke execute on function public.notify_billing_change() from public,anon,authenticated;
revoke execute on function public.notify_point_reversal() from public,anon,authenticated;
revoke execute on function public.notify_leaderboard_closed() from public,anon,authenticated;
revoke execute on function public.enqueue_lesson_reminders() from public,anon,authenticated;
revoke execute on function public.admin_teacher_overview() from public,anon;
revoke execute on function public.admin_set_teacher_workspace_status(uuid,text,text) from public,anon;

grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.admin_teacher_overview() to authenticated;
grant execute on function public.admin_set_teacher_workspace_status(uuid,text,text) to authenticated;

-- create_enrollment_invite remains an authenticated RPC after replacement.
revoke execute on function public.create_enrollment_invite(text,numeric,integer) from public,anon;
grant execute on function public.create_enrollment_invite(text,numeric,integer) to authenticated;

alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select
using(
  recipient_user_id=(select auth.uid())
  or public.is_platform_admin()
);

drop policy if exists notification_deliveries_admin_select on public.notification_deliveries;
create policy notification_deliveries_admin_select on public.notification_deliveries for select
using(public.is_platform_admin());

-- Lesson reminders are queued independently of business logic every 15 minutes.
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
    '*/15 * * * *',
    'select public.enqueue_lesson_reminders();'
  );
end;
$$;
