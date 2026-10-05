-- V7 Notifications foundation.
-- In-app notifications are active now; delivery channels remain extensible through notification_deliveries.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  title text not null check (char_length(trim(title)) between 2 and 160),
  body text not null check (char_length(trim(body)) between 2 and 500),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists notifications_user_created_idx
  on public.notifications(user_id,created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id,created_at desc)
  where read_at is null;

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel text not null check (channel in ('IN_APP','EMAIL')),
  status text not null default 'PENDING'
    check (status in ('PENDING','SENT','FAILED','SKIPPED')),
  provider_reference text,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique(notification_id,channel)
);
create index if not exists notification_deliveries_status_idx
  on public.notification_deliveries(channel,status,created_at);

alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
on public.notifications
for select
to authenticated
using (user_id=(select auth.uid()));

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
on public.notifications
for update
to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

drop policy if exists notification_deliveries_deny_direct on public.notification_deliveries;
create policy notification_deliveries_deny_direct
on public.notification_deliveries
for all
to authenticated
using (false)
with check (false);

create or replace function public.create_notification(
  p_user_id uuid,
  p_event_type text,
  p_title text,
  p_body text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.notifications
language plpgsql
security definer
set search_path=public
as $$$
declare
  v_row public.notifications;
begin
  if p_user_id is null then return null; end if;
  insert into public.notifications(user_id,event_type,title,body,metadata)
  values(
    p_user_id,
    trim(coalesce(p_event_type,'')),
    trim(p_title),
    trim(p_body),
    coalesce(p_metadata,'{}'::jsonb)
  )
  returning * into v_row;

  insert into public.notification_deliveries(notification_id,channel,status)
  values(v_row.id,'IN_APP','SENT')
  on conflict(notification_id,channel) do nothing;

  return v_row;
end;
$$;

revoke execute on function public.create_notification(uuid,text,text,text,jsonb) from public,anon,authenticated;

create or replace function public.notification_parent_for_child(p_student_id uuid)
returns uuid
language sql
stable
security definer
set search_path=public
as $$$
  select coalesce(
    (
      select r.parent_user_id
      from public.parent_student_relations r
      where r.student_id=p_student_id and r.is_owner=true
      limit 1
    ),
    (
      select c.parent_id
      from public.child_profiles c
      where c.id=p_student_id
      limit 1
    )
  );
$$;

create or replace function public.notify_task_assignment_created()
returns trigger
language plpgsql
security definer
set search_path=public
as $$$
declare
  v_parent uuid;
  v_task public.tasks;
begin
  v_parent:=public.notification_parent_for_child(new.student_id);
  select * into v_task from public.tasks where id=new.task_id;
  perform public.create_notification(
    v_parent,
    'TASK_ASSIGNED',
    'مهمة جديدة للطفل',
    coalesce(v_task.title,'تم إسناد مهمة جديدة')||' • '||coalesce(v_task.points_reward,0)||' نقطة بعد اعتماد المعلم',
    jsonb_build_object('assignment_id',new.id,'task_id',new.task_id,'student_id',new.student_id,'enrollment_id',new.enrollment_id)
  );
  return new;
end;
$$;

drop trigger if exists task_assignment_notification_created on public.task_assignments;
create trigger task_assignment_notification_created
after insert on public.task_assignments
for each row execute function public.notify_task_assignment_created();

create or replace function public.notify_task_assignment_status()
returns trigger
language plpgsql
security definer
set search_path=public
as $$$
declare
  v_parent uuid;
  v_submission public.task_submissions;
  v_task public.tasks;
  v_title text;
  v_body text;
begin
  if new.status=old.status then return new; end if;
  if new.status not in ('approved','rejected') then return new; end if;

  v_parent:=public.notification_parent_for_child(new.student_id);
  select * into v_task from public.tasks where id=new.task_id;
  select * into v_submission
  from public.task_submissions
  where assignment_id=new.id
  order by submitted_at desc
  limit 1;

  if new.status='approved' then
    v_title:='تم اعتماد المهمة';
    v_body:=coalesce(v_task.title,'المهمة')||' • تمت إضافة النقاط إلى رصيد الطفل';
  else
    v_title:='تحتاج المهمة إلى إعادة';
    v_body:=coalesce(v_task.title,'المهمة')||case when v_submission.rejection_note is not null then ' • السبب: '||v_submission.rejection_note else '' end;
  end if;

  perform public.create_notification(
    v_parent,
    case when new.status='approved' then 'TASK_APPROVED' else 'TASK_REJECTED' end,
    v_title,
    v_body,
    jsonb_build_object('assignment_id',new.id,'student_id',new.student_id,'enrollment_id',new.enrollment_id,'status',new.status)
  );
  return new;
end;
$$;

drop trigger if exists task_assignment_notification_status on public.task_assignments;
create trigger task_assignment_notification_status
after update of status on public.task_assignments
for each row execute function public.notify_task_assignment_status();

create or replace function public.notify_task_submission_created()
returns trigger
language plpgsql
security definer
set search_path=public
as $$$
declare
  v_assignment public.task_assignments;
  v_task public.tasks;
  v_teacher uuid;
begin
  select * into v_assignment from public.task_assignments where id=new.assignment_id;
  select * into v_task from public.tasks where id=v_assignment.task_id;
  select teacher_user_id into v_teacher from public.enrollments where id=v_assignment.enrollment_id;

  perform public.create_notification(
    v_teacher,
    'TASK_SUBMITTED',
    'تسليم مهمة يحتاج مراجعتك',
    coalesce(v_task.title,'مهمة جديدة')||' • أرسل ولي الأمر إنجاز المهمة',
    jsonb_build_object('submission_id',new.id,'assignment_id',new.assignment_id,'student_id',v_assignment.student_id,'enrollment_id',v_assignment.enrollment_id)
  );
  return new;
end;
$$;

drop trigger if exists task_submission_notification_created on public.task_submissions;
create trigger task_submission_notification_created
after insert on public.task_submissions
for each row execute function public.notify_task_submission_created();

create or replace function public.notify_session_changed()
returns trigger
language plpgsql
security definer
set search_path=public
as $$$
declare
  v_parent uuid;
  v_student uuid;
  v_title text;
  v_body text;
  v_type text;
begin
  if new.status=old.status and new.scheduled_start_utc=old.scheduled_start_utc then return new; end if;

  select student_id into v_student from public.enrollments where id=new.enrollment_id;
  v_parent:=public.notification_parent_for_child(v_student);
  if v_parent is null then return new; end if;

  if new.status='COMPLETED' and old.status='SCHEDULED' then
    v_type:='LESSON_COMPLETED';v_title:='تم إنهاء الحصة';v_body:='تم تسجيل الحصة كمكتملة مع المعلم.';
  elsif new.status in ('CANCELLED','EARLY_CANCELLATION','LATE_CANCELLATION') and new.status<>old.status then
    v_type:='LESSON_CANCELLED';v_title:='تم تغيير حالة الحصة';v_body:='حالة الحصة أصبحت: '||new.status;
  elsif new.status='RESCHEDULED' or new.scheduled_start_utc<>old.scheduled_start_utc then
    v_type:='LESSON_RESCHEDULED';v_title:='تم تعديل موعد الحصة';v_body:='تم تحديث موعد الحصة المرتبطة بالمعلم.';
  else
    return new;
  end if;

  perform public.create_notification(
    v_parent,v_type,v_title,v_body,
    jsonb_build_object('session_id',new.id,'student_id',v_student,'enrollment_id',new.enrollment_id,'status',new.status,'scheduled_start_utc',new.scheduled_start_utc)
  );
  return new;
end;
$$;

drop trigger if exists session_notification_changed on public.sessions;
create trigger session_notification_changed
after update of status,scheduled_start_utc on public.sessions
for each row execute function public.notify_session_changed();

create or replace function public.notify_point_ledger_insert()
returns trigger
language plpgsql
security definer
set search_path=public
as $$$
declare
  v_parent uuid;
  v_title text;
  v_body text;
begin
  if new.transaction_type='TASK_APPROVED' then return new; end if;
  if new.transaction_type='GAME_PURCHASE' then
    v_title:='تم استخدام نقاط لفتح لعبة';
    v_body:='تم تسجيل شراء لعبة باستخدام '||abs(coalesce(new.wallet_delta,0))||' نقطة.';
  elsif new.wallet_delta<0 and new.transaction_type='POINT_REVERSAL' then
    v_title:='تم سحب نقاط';
    v_body:='تم تسجيل سحب '||abs(coalesce(new.wallet_delta,0))||' نقطة.'||case when new.reason is not null then ' السبب: '||new.reason else '' end;
  elsif new.wallet_delta>0 then
    v_title:='تمت إضافة نقاط';
    v_body:='أضيف إلى رصيد الطفل '||coalesce(new.wallet_delta,0)||' نقطة'||case when new.reason is not null then ' • '||new.reason else '' end;
  else
    return new;
  end if;

  v_parent:=public.notification_parent_for_child(new.student_id);
  perform public.create_notification(
    v_parent,'POINTS_CHANGED',v_title,v_body,
    jsonb_build_object('transaction_id',new.id,'student_id',new.student_id,'transaction_type',new.transaction_type,'wallet_delta',new.wallet_delta)
  );
  return new;
end;
$$;

drop trigger if exists point_ledger_notification_insert on public.point_ledger;
create trigger point_ledger_notification_insert
after insert on public.point_ledger
for each row execute function public.notify_point_ledger_insert();

create or replace function public.notify_enrollment_created()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_teacher_name text;
  v_child_name text;
begin
  select display_name into v_teacher_name from public.profiles where id=new.teacher_user_id;
  select display_name into v_child_name from public.child_profiles where id=new.student_id;

  perform public.create_notification(
    new.teacher_user_id,
    'ENROLLMENT_ACCEPTED',
    'تم ربط طالب جديد',
    coalesce(v_child_name,'الطالب')||' • تم قبول الدعوة وإضافة الطالب إلى مساحتك.',
    jsonb_build_object('enrollment_id',new.id,'student_id',new.student_id,'workspace_id',new.workspace_id)
  );
  return new;
end;
$$;

drop trigger if exists enrollment_notification_created on public.enrollments;
create trigger enrollment_notification_created
after insert on public.enrollments
for each row execute function public.notify_enrollment_created();

create or replace function public.notify_billing_changed()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_student uuid;
  v_parent uuid;
  v_title text;
  v_body text;
begin
  select student_id into v_student from public.enrollments where id=new.enrollment_id;
  v_parent:=public.notification_parent_for_child(v_student);
  if v_parent is null then return new; end if;

  if tg_op='INSERT' and new.status='DUE' then
    v_title:='استحقاق حصة جديد';
    v_body:='تم تسجيل استحقاق مالي للحصة بقيمة '||new.amount||'.';
  elsif tg_op='UPDATE' and new.status<>old.status and new.status='PAID' then
    v_title:='تم تحديث استحقاق الحصة';
    v_body:='تم تسجيل الاستحقاق كمدفوع.';
  elsif tg_op='UPDATE' and new.status<>old.status and new.status='WAIVED' then
    v_title:='تم إعفاء استحقاق الحصة';
    v_body:='تم إعفاء الاستحقاق وتسجيل ذلك في السجل.';
  else
    return new;
  end if;

  perform public.create_notification(
    v_parent,
    'TUITION_STATUS_CHANGED',
    v_title,
    v_body,
    jsonb_build_object('billing_entry_id',new.id,'session_id',new.session_id,'student_id',v_student,'enrollment_id',new.enrollment_id,'status',new.status)
  );
  return new;
end;
$$;

drop trigger if exists session_billing_notification_changed on public.session_billing_entries;
create trigger session_billing_notification_changed
after insert or update of status on public.session_billing_entries
for each row execute function public.notify_billing_changed();


-- Internal notification helpers are trigger-only and must not be exposed as callable RPCs.
revoke execute on function public.notification_parent_for_child(uuid) from public,anon,authenticated;
revoke execute on function public.notify_task_assignment_created() from public,anon,authenticated;
revoke execute on function public.notify_task_assignment_status() from public,anon,authenticated;
revoke execute on function public.notify_task_submission_created() from public,anon,authenticated;
revoke execute on function public.notify_session_changed() from public,anon,authenticated;
revoke execute on function public.notify_point_ledger_insert() from public,anon,authenticated;
revoke execute on function public.notify_enrollment_created() from public,anon,authenticated;
revoke execute on function public.notify_billing_changed() from public,anon,authenticated;
create or replace function public.notify_leaderboard_snapshot_created()
returns trigger
language plpgsql
security definer
set search_path=public
as $$$
declare
  v_parent uuid;
  v_suffix text;
begin
  v_parent:=public.notification_parent_for_child(new.student_id);
  if v_parent is null then return new; end if;

  v_suffix:=case when new.reward_points>0 then ' • مكافأة '+new.reward_points+' نقطة' else '' end;
  perform public.create_notification(
    v_parent,
    'WEEKLY_RESULT',
    'نتيجة الأسبوع',
    'احتل الطفل المركز '||new.rank||' برصيد '||new.final_score||' نقطة'||v_suffix||'.',
    jsonb_build_object(
      'snapshot_id',new.id,
      'leaderboard_week_id',new.leaderboard_week_id,
      'student_id',new.student_id,
      'rank',new.rank,
      'final_score',new.final_score,
      'reward_points',new.reward_points
    )
  );
  return new;
end;
$$;

drop trigger if exists leaderboard_snapshot_notification_created on public.leaderboard_snapshots;
create trigger leaderboard_snapshot_notification_created
after insert on public.leaderboard_snapshots
for each row execute function public.notify_leaderboard_snapshot_created();

revoke execute on function public.notify_leaderboard_snapshot_created() from public,anon,authenticated;
