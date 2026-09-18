-- V7 Phase 3: tasks, parent submission and teacher academic approval.
-- PARENT_SUBMITTED is represented by an immutable task_submissions row.
-- The assignment itself moves directly to pending_teacher_approval for the actionable state.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.teacher_workspaces(id) on delete cascade,
  teacher_user_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 2 and 160),
  task_type text not null check (task_type in ('NEW_MEMORIZATION','REVIEW','RECITATION','BEHAVIOR')),
  points_reward integer not null check (points_reward between 0 and 100000),
  teacher_note text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tasks_workspace_created_idx on public.tasks(workspace_id,created_at desc);
create index if not exists tasks_teacher_idx on public.tasks(teacher_user_id,created_at desc);

create table if not exists public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  student_id uuid not null references public.child_profiles(id) on delete restrict,
  due_at timestamptz not null,
  status text not null default 'assigned'
    check (status in ('assigned','pending_teacher_approval','approved','rejected')),
  assigned_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  reward_transaction_id uuid references public.point_ledger(id) on delete restrict,
  updated_at timestamptz not null default now()
);
create index if not exists task_assignments_student_status_idx
  on public.task_assignments(student_id,status,due_at);
create index if not exists task_assignments_enrollment_status_idx
  on public.task_assignments(enrollment_id,status,due_at);
create index if not exists task_assignments_task_idx on public.task_assignments(task_id);
create unique index if not exists task_assignments_reward_tx_idx
  on public.task_assignments(reward_transaction_id)
  where reward_transaction_id is not null;

create table if not exists public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.task_assignments(id) on delete cascade,
  submitted_by_parent_id uuid not null references public.profiles(id) on delete restrict,
  parent_note text,
  submitted_at timestamptz not null default now(),
  decision text not null default 'pending'
    check (decision in ('pending','approved','rejected')),
  reviewed_by_teacher_id uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  rejection_note text,
  teacher_note text
);
create index if not exists task_submissions_assignment_idx
  on public.task_submissions(assignment_id,submitted_at desc);
create index if not exists task_submissions_parent_idx
  on public.task_submissions(submitted_by_parent_id,submitted_at desc);
create index if not exists task_submissions_reviewer_idx
  on public.task_submissions(reviewed_by_teacher_id,reviewed_at desc)
  where reviewed_by_teacher_id is not null;

drop trigger if exists task_assignments_set_updated_at on public.task_assignments;
create trigger task_assignments_set_updated_at
before update on public.task_assignments
for each row execute function public.set_updated_at();

create or replace function public.create_task_assignment(
  p_enrollment_id uuid,
  p_title text,
  p_task_type text,
  p_points_reward integer,
  p_due_at timestamptz,
  p_teacher_note text default null
)
returns public.task_assignments
language plpgsql
security definer
set search_path=public
as $$
declare
  v_enrollment public.enrollments;
  v_task public.tasks;
  v_assignment public.task_assignments;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select * into v_enrollment
  from public.enrollments
  where id=p_enrollment_id
  for share;

  if v_enrollment.id is null
     or v_enrollment.teacher_user_id<>auth.uid()
     or v_enrollment.status<>'active'
     or not public.owns_teacher_workspace(v_enrollment.workspace_id) then
    raise exception 'active_enrollment_required' using errcode='42501';
  end if;

  if char_length(trim(coalesce(p_title,'')))<2 then raise exception 'task_title_required'; end if;
  if p_task_type not in ('NEW_MEMORIZATION','REVIEW','RECITATION','BEHAVIOR') then raise exception 'invalid_task_type'; end if;
  if coalesce(p_points_reward,-1)<0 or p_points_reward>100000 then raise exception 'invalid_task_points'; end if;
  if p_due_at is null then raise exception 'due_date_required'; end if;

  insert into public.tasks(workspace_id,teacher_user_id,title,task_type,points_reward,teacher_note)
  values(
    v_enrollment.workspace_id,auth.uid(),trim(p_title),p_task_type,p_points_reward,
    nullif(trim(coalesce(p_teacher_note,'')),'')
  )
  returning * into v_task;

  insert into public.task_assignments(task_id,enrollment_id,student_id,due_at)
  values(v_task.id,v_enrollment.id,v_enrollment.student_id,p_due_at)
  returning * into v_assignment;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_state)
  values(auth.uid(),'TASK_ASSIGNED','task_assignment',v_assignment.id,
    jsonb_build_object('task_id',v_task.id,'student_id',v_assignment.student_id,'enrollment_id',v_assignment.enrollment_id,'due_at',v_assignment.due_at,'points',v_task.points_reward));

  return v_assignment;
end;
$$;

create or replace function public.submit_task_assignment(
  p_assignment_id uuid,
  p_parent_note text default null
)
returns public.task_submissions
language plpgsql
security definer
set search_path=public
as $$
declare
  v_assignment public.task_assignments;
  v_submission public.task_submissions;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;

  select * into v_assignment
  from public.task_assignments
  where id=p_assignment_id
  for update;

  if v_assignment.id is null then raise exception 'assignment_not_found'; end if;
  if not public.is_child_owner(v_assignment.student_id) then
    raise exception 'child_not_owned' using errcode='42501';
  end if;
  if v_assignment.status not in ('assigned','rejected') then
    raise exception 'assignment_not_submittable';
  end if;

  insert into public.task_submissions(assignment_id,submitted_by_parent_id,parent_note)
  values(v_assignment.id,auth.uid(),nullif(trim(coalesce(p_parent_note,'')),''))
  returning * into v_submission;

  update public.task_assignments
  set status='pending_teacher_approval',
      rejected_at=null
  where id=v_assignment.id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_state)
  values(auth.uid(),'TASK_PARENT_SUBMITTED','task_submission',v_submission.id,
    jsonb_build_object('assignment_id',v_assignment.id,'student_id',v_assignment.student_id));

  return v_submission;
end;
$$;

create or replace function public.review_task_assignment(
  p_assignment_id uuid,
  p_approve boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_assignment public.task_assignments;
  v_task public.tasks;
  v_enrollment public.enrollments;
  v_submission public.task_submissions;
  v_tx public.point_ledger;
  v_note text:=nullif(trim(coalesce(p_note,'')),'');
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;

  select * into v_assignment
  from public.task_assignments
  where id=p_assignment_id
  for update;

  if v_assignment.id is null then raise exception 'assignment_not_found'; end if;
  if v_assignment.status<>'pending_teacher_approval' then raise exception 'assignment_not_pending'; end if;

  select * into v_enrollment from public.enrollments where id=v_assignment.enrollment_id;
  if v_enrollment.id is null
     or v_enrollment.teacher_user_id<>auth.uid()
     or not public.owns_teacher_workspace(v_enrollment.workspace_id) then
    raise exception 'teacher_not_allowed' using errcode='42501';
  end if;

  select * into v_task from public.tasks where id=v_assignment.task_id;
  if v_task.id is null or v_task.workspace_id<>v_enrollment.workspace_id then
    raise exception 'task_context_invalid';
  end if;

  select * into v_submission
  from public.task_submissions
  where assignment_id=v_assignment.id and decision='pending'
  order by submitted_at desc
  limit 1
  for update;

  if v_submission.id is null then raise exception 'pending_submission_not_found'; end if;

  if not coalesce(p_approve,false) then
    if v_note is null then raise exception 'rejection_reason_required'; end if;

    update public.task_submissions
    set decision='rejected',reviewed_by_teacher_id=auth.uid(),reviewed_at=now(),
        rejection_note=v_note,teacher_note=v_note
    where id=v_submission.id;

    update public.task_assignments
    set status='rejected',rejected_at=now()
    where id=v_assignment.id;

    insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,reason,after_state)
    values(auth.uid(),'TASK_REJECTED','task_assignment',v_assignment.id,v_note,
      jsonb_build_object('submission_id',v_submission.id,'student_id',v_assignment.student_id));

    return jsonb_build_object('status','rejected','assignment_id',v_assignment.id,'submission_id',v_submission.id);
  end if;

  insert into public.point_ledger(
    student_id,enrollment_id,workspace_id,transaction_type,
    wallet_delta,lifetime_delta,weekly_delta,
    source_type,source_id,source_key,idempotency_key,
    reason,created_by_user_id,metadata
  ) values(
    v_assignment.student_id,v_assignment.enrollment_id,v_enrollment.workspace_id,'TASK_APPROVED',
    v_task.points_reward,v_task.points_reward,v_task.points_reward,
    'task_assignment',v_assignment.id,'task:'||v_assignment.id::text,
    'task-approved:'||v_assignment.id::text,
    v_note,auth.uid(),
    jsonb_build_object('task_id',v_task.id,'task_type',v_task.task_type,'title',v_task.title)
  )
  on conflict(student_id,idempotency_key) where idempotency_key is not null do nothing
  returning * into v_tx;

  if v_tx.id is null then
    select * into v_tx
    from public.point_ledger
    where student_id=v_assignment.student_id
      and idempotency_key='task-approved:'||v_assignment.id::text;
  end if;

  update public.task_submissions
  set decision='approved',reviewed_by_teacher_id=auth.uid(),reviewed_at=now(),teacher_note=v_note
  where id=v_submission.id;

  update public.task_assignments
  set status='approved',approved_at=now(),reward_transaction_id=v_tx.id
  where id=v_assignment.id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,reason,after_state)
  values(auth.uid(),'TASK_APPROVED','task_assignment',v_assignment.id,v_note,
    jsonb_build_object('submission_id',v_submission.id,'student_id',v_assignment.student_id,'reward_transaction_id',v_tx.id,'points',v_task.points_reward));

  return jsonb_build_object(
    'status','approved','assignment_id',v_assignment.id,
    'submission_id',v_submission.id,'reward_transaction_id',v_tx.id,
    'points',v_task.points_reward
  );
end;
$$;

revoke all on public.tasks from anon,authenticated;
revoke all on public.task_assignments from anon,authenticated;
revoke all on public.task_submissions from anon,authenticated;
grant select on public.tasks to authenticated;
grant select on public.task_assignments to authenticated;
grant select on public.task_submissions to authenticated;

revoke execute on function public.create_task_assignment(uuid,text,text,integer,timestamptz,text) from public,anon;
revoke execute on function public.submit_task_assignment(uuid,text) from public,anon;
revoke execute on function public.review_task_assignment(uuid,boolean,text) from public,anon;
grant execute on function public.create_task_assignment(uuid,text,text,integer,timestamptz,text) to authenticated;
grant execute on function public.submit_task_assignment(uuid,text) to authenticated;
grant execute on function public.review_task_assignment(uuid,boolean,text) to authenticated;

alter table public.tasks enable row level security;
alter table public.task_assignments enable row level security;
alter table public.task_submissions enable row level security;

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select
using(
  public.owns_teacher_workspace(workspace_id)
  or public.is_platform_admin()
  or exists(
    select 1 from public.task_assignments a
    where a.task_id=tasks.id and public.is_child_owner(a.student_id)
  )
);

drop policy if exists task_assignments_select on public.task_assignments;
create policy task_assignments_select on public.task_assignments for select
using(
  public.is_child_owner(student_id)
  or public.is_platform_admin()
  or exists(
    select 1
    from public.enrollments e
    where e.id=task_assignments.enrollment_id
      and e.teacher_user_id=(select auth.uid())
      and public.owns_teacher_workspace(e.workspace_id)
  )
);

drop policy if exists task_submissions_select on public.task_submissions;
create policy task_submissions_select on public.task_submissions for select
using(
  submitted_by_parent_id=(select auth.uid())
  or public.is_platform_admin()
  or exists(
    select 1
    from public.task_assignments a
    join public.enrollments e on e.id=a.enrollment_id
    where a.id=task_submissions.assignment_id
      and e.teacher_user_id=(select auth.uid())
      and public.owns_teacher_workspace(e.workspace_id)
  )
);
