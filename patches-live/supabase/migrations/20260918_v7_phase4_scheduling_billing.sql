-- V7 Phase 4: recurring scheduling, session lifecycle, and parent tuition CRM.
-- Product source: docs/MASTER_PRD_V7.md sections 5, 6, 14.3, 16.4, 17.3 and 22.6.

create table if not exists public.recurring_schedule_rules (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  workspace_id uuid not null references public.teacher_workspaces(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  local_start_time time without time zone not null,
  duration_minutes integer not null check (duration_minutes between 15 and 240),
  timezone text not null,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists recurring_schedule_active_slot_idx
  on public.recurring_schedule_rules(enrollment_id,weekday,local_start_time)
  where active=true;
create index if not exists recurring_schedule_workspace_idx
  on public.recurring_schedule_rules(workspace_id,active);
create index if not exists recurring_schedule_created_by_idx
  on public.recurring_schedule_rules(created_by);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  workspace_id uuid not null references public.teacher_workspaces(id) on delete restrict,
  schedule_rule_id uuid references public.recurring_schedule_rules(id) on delete set null,
  scheduled_start_utc timestamptz not null,
  scheduled_end_utc timestamptz not null,
  status text not null default 'SCHEDULED'
    check (status in (
      'SCHEDULED','COMPLETED','STUDENT_NO_SHOW','TEACHER_NO_SHOW',
      'EARLY_CANCELLATION','LATE_CANCELLATION','RESCHEDULED','CANCELLED'
    )),
  rescheduled_from_session_id uuid references public.sessions(id) on delete restrict,
  cancellation_actor text
    check (cancellation_actor is null or cancellation_actor in ('TEACHER','PARENT','ADMIN')),
  cancellation_at timestamptz,
  completed_at timestamptz,
  teacher_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end_utc > scheduled_start_utc)
);
create unique index if not exists sessions_rule_occurrence_idx
  on public.sessions(schedule_rule_id,scheduled_start_utc)
  where schedule_rule_id is not null;
create index if not exists sessions_enrollment_start_idx
  on public.sessions(enrollment_id,scheduled_start_utc);
create index if not exists sessions_workspace_start_idx
  on public.sessions(workspace_id,scheduled_start_utc);
create index if not exists sessions_status_start_idx
  on public.sessions(status,scheduled_start_utc);
create index if not exists sessions_rescheduled_from_idx
  on public.sessions(rescheduled_from_session_id)
  where rescheduled_from_session_id is not null;

create table if not exists public.session_billing_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id) on delete restrict,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  workspace_id uuid not null references public.teacher_workspaces(id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'DUE'
    check (status in ('DUE','PAID','WAIVED')),
  auto_charge_reason text not null,
  override_reason text,
  paid_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists session_billing_enrollment_status_idx
  on public.session_billing_entries(enrollment_id,status,created_at desc);
create index if not exists session_billing_workspace_status_idx
  on public.session_billing_entries(workspace_id,status,created_at desc);
create index if not exists session_billing_updated_by_idx
  on public.session_billing_entries(updated_by)
  where updated_by is not null;

drop trigger if exists recurring_schedule_rules_set_updated_at on public.recurring_schedule_rules;
create trigger recurring_schedule_rules_set_updated_at
before update on public.recurring_schedule_rules
for each row execute function public.set_updated_at();

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_updated_at();

drop trigger if exists session_billing_entries_set_updated_at on public.session_billing_entries;
create trigger session_billing_entries_set_updated_at
before update on public.session_billing_entries
for each row execute function public.set_updated_at();

create or replace function public.materialize_schedule_rule(
  p_rule_id uuid,
  p_weeks_ahead integer default 12
)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_rule public.recurring_schedule_rules;
  v_enrollment public.enrollments;
  v_today_local date;
  v_first_date date;
  v_occurrence_date date;
  v_dow integer;
  v_delta integer;
  v_start timestamptz;
  v_end timestamptz;
  v_inserted integer:=0;
  v_i integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if coalesce(p_weeks_ahead,0)<1 or p_weeks_ahead>52 then raise exception 'invalid_weeks_ahead'; end if;

  select * into v_rule
  from public.recurring_schedule_rules
  where id=p_rule_id
  for share;

  if v_rule.id is null then raise exception 'schedule_rule_not_found'; end if;
  if not v_rule.active then raise exception 'schedule_rule_inactive'; end if;
  if not public.owns_teacher_workspace(v_rule.workspace_id) then
    raise exception 'teacher_not_allowed' using errcode='42501';
  end if;

  select * into v_enrollment
  from public.enrollments
  where id=v_rule.enrollment_id
    and workspace_id=v_rule.workspace_id
    and status='active';

  if v_enrollment.id is null then raise exception 'active_enrollment_required'; end if;

  v_today_local := (now() at time zone v_rule.timezone)::date;
  v_dow := extract(dow from v_today_local)::integer;
  v_delta := (v_rule.weekday - v_dow + 7) % 7;
  v_first_date := v_today_local + v_delta;

  v_start := (v_first_date + v_rule.local_start_time) at time zone v_rule.timezone;
  if v_start <= now() then
    v_first_date := v_first_date + 7;
  end if;

  for v_i in 0..p_weeks_ahead-1 loop
    v_occurrence_date := v_first_date + (v_i * 7);
    v_start := (v_occurrence_date + v_rule.local_start_time) at time zone v_rule.timezone;
    v_end := v_start + make_interval(mins=>v_rule.duration_minutes);

    insert into public.sessions(
      enrollment_id,workspace_id,schedule_rule_id,scheduled_start_utc,scheduled_end_utc,status
    ) values(
      v_rule.enrollment_id,v_rule.workspace_id,v_rule.id,v_start,v_end,'SCHEDULED'
    )
    on conflict do nothing;

    if found then v_inserted:=v_inserted+1; end if;
  end loop;

  return v_inserted;
end;
$$;

create or replace function public.create_recurring_schedule_rule(
  p_enrollment_id uuid,
  p_weekday integer,
  p_local_start_time time without time zone,
  p_duration_minutes integer default 45,
  p_weeks_ahead integer default 12
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_enrollment public.enrollments;
  v_workspace public.teacher_workspaces;
  v_rule public.recurring_schedule_rules;
  v_created integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_weekday is null or p_weekday<0 or p_weekday>6 then raise exception 'invalid_weekday'; end if;
  if p_local_start_time is null then raise exception 'start_time_required'; end if;
  if coalesce(p_duration_minutes,0)<15 or p_duration_minutes>240 then raise exception 'invalid_duration'; end if;
  if coalesce(p_weeks_ahead,0)<1 or p_weeks_ahead>52 then raise exception 'invalid_weeks_ahead'; end if;

  select * into v_enrollment
  from public.enrollments
  where id=p_enrollment_id
  for share;

  if v_enrollment.id is null
     or v_enrollment.status<>'active'
     or v_enrollment.teacher_user_id<>auth.uid()
     or not public.owns_teacher_workspace(v_enrollment.workspace_id) then
    raise exception 'active_enrollment_required' using errcode='42501';
  end if;

  select * into v_workspace
  from public.teacher_workspaces
  where id=v_enrollment.workspace_id and owner_teacher_user_id=auth.uid() and status='active';

  if v_workspace.id is null then raise exception 'teacher_workspace_inactive' using errcode='42501'; end if;
  if not exists(select 1 from pg_timezone_names where name=v_workspace.timezone) then
    raise exception 'invalid_workspace_timezone';
  end if;

  insert into public.recurring_schedule_rules(
    enrollment_id,workspace_id,weekday,local_start_time,duration_minutes,timezone,created_by
  ) values(
    v_enrollment.id,v_enrollment.workspace_id,p_weekday,p_local_start_time,p_duration_minutes,v_workspace.timezone,auth.uid()
  )
  returning * into v_rule;

  v_created:=public.materialize_schedule_rule(v_rule.id,p_weeks_ahead);

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_state)
  values(
    auth.uid(),'RECURRING_SCHEDULE_CREATED','recurring_schedule_rule',v_rule.id,
    jsonb_build_object(
      'enrollment_id',v_rule.enrollment_id,'weekday',v_rule.weekday,
      'local_start_time',v_rule.local_start_time,'duration_minutes',v_rule.duration_minutes,
      'timezone',v_rule.timezone,'sessions_created',v_created
    )
  );

  return jsonb_build_object('rule_id',v_rule.id,'sessions_created',v_created,'timezone',v_rule.timezone);
end;
$$;

create or replace function public.set_recurring_schedule_rule_active(
  p_rule_id uuid,
  p_active boolean
)
returns public.recurring_schedule_rules
language plpgsql
security definer
set search_path=public
as $$
declare
  v_rule public.recurring_schedule_rules;
  v_before jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;

  select * into v_rule
  from public.recurring_schedule_rules
  where id=p_rule_id
  for update;

  if v_rule.id is null then raise exception 'schedule_rule_not_found'; end if;
  if not public.owns_teacher_workspace(v_rule.workspace_id) then
    raise exception 'teacher_not_allowed' using errcode='42501';
  end if;

  v_before:=to_jsonb(v_rule);

  update public.recurring_schedule_rules
  set active=coalesce(p_active,false)
  where id=v_rule.id
  returning * into v_rule;

  if not v_rule.active then
    update public.sessions
    set status='CANCELLED',
        cancellation_actor='TEACHER',
        cancellation_at=now(),
        teacher_note=coalesce(teacher_note,'') || case when coalesce(teacher_note,'')='' then '' else E'\n' end || 'Recurring schedule paused'
    where schedule_rule_id=v_rule.id
      and status='SCHEDULED'
      and scheduled_start_utc>now();
  end if;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_state,after_state)
  values(auth.uid(),'RECURRING_SCHEDULE_ACTIVE_CHANGED','recurring_schedule_rule',v_rule.id,v_before,to_jsonb(v_rule));

  return v_rule;
end;
$$;

create or replace function public.ensure_session_billing(p_session_id uuid)
returns public.session_billing_entries
language plpgsql
security definer
set search_path=public
as $$
declare
  v_session public.sessions;
  v_enrollment public.enrollments;
  v_entry public.session_billing_entries;
begin
  select * into v_session
  from public.sessions
  where id=p_session_id
  for share;

  if v_session.id is null then raise exception 'session_not_found'; end if;
  if v_session.status not in ('COMPLETED','STUDENT_NO_SHOW','LATE_CANCELLATION') then
    return null;
  end if;

  select * into v_enrollment
  from public.enrollments
  where id=v_session.enrollment_id;

  if v_enrollment.id is null then raise exception 'enrollment_not_found'; end if;

  insert into public.session_billing_entries(
    session_id,enrollment_id,workspace_id,amount,status,auto_charge_reason
  ) values(
    v_session.id,v_session.enrollment_id,v_session.workspace_id,v_enrollment.session_rate,'DUE',v_session.status
  )
  on conflict(session_id) do nothing
  returning * into v_entry;

  if v_entry.id is null then
    select * into v_entry from public.session_billing_entries where session_id=v_session.id;
  end if;

  return v_entry;
end;
$$;

create or replace function public.finalize_session(
  p_session_id uuid,
  p_status text,
  p_teacher_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_session public.sessions;
  v_before jsonb;
  v_entry public.session_billing_entries;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_status not in ('COMPLETED','STUDENT_NO_SHOW','TEACHER_NO_SHOW') then
    raise exception 'invalid_final_session_status';
  end if;

  select * into v_session
  from public.sessions
  where id=p_session_id
  for update;

  if v_session.id is null then raise exception 'session_not_found'; end if;
  if v_session.status<>'SCHEDULED' then raise exception 'session_not_scheduled'; end if;
  if not public.owns_teacher_workspace(v_session.workspace_id) then
    raise exception 'teacher_not_allowed' using errcode='42501';
  end if;

  v_before:=to_jsonb(v_session);

  update public.sessions
  set status=p_status,
      completed_at=case when p_status='COMPLETED' then now() else null end,
      teacher_note=nullif(trim(coalesce(p_teacher_note,'')),'')
  where id=v_session.id
  returning * into v_session;

  v_entry:=public.ensure_session_billing(v_session.id);

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_state,after_state)
  values(auth.uid(),'SESSION_FINALIZED','session',v_session.id,v_before,to_jsonb(v_session));

  return jsonb_build_object(
    'session_id',v_session.id,
    'status',v_session.status,
    'billing_entry_id',v_entry.id,
    'billable',v_entry.id is not null
  );
end;
$$;

create or replace function public.cancel_session(
  p_session_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_session public.sessions;
  v_enrollment public.enrollments;
  v_hours integer:=24;
  v_actor text;
  v_status text;
  v_before jsonb;
  v_entry public.session_billing_entries;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;

  select * into v_session
  from public.sessions
  where id=p_session_id
  for update;

  if v_session.id is null then raise exception 'session_not_found'; end if;
  if v_session.status<>'SCHEDULED' then raise exception 'session_not_scheduled'; end if;
  if v_session.scheduled_start_utc<=now() then raise exception 'session_already_started'; end if;

  select * into v_enrollment
  from public.enrollments
  where id=v_session.enrollment_id;

  if v_enrollment.id is null then raise exception 'enrollment_not_found'; end if;

  if public.owns_teacher_workspace(v_session.workspace_id) then
    v_actor:='TEACHER';
    v_status:='CANCELLED';
  elsif public.is_child_owner(v_enrollment.student_id) then
    v_actor:='PARENT';
    select coalesce(ts.late_cancellation_hours,24)
      into v_hours
      from public.teacher_settings ts
      where ts.workspace_id=v_session.workspace_id;
    v_hours:=coalesce(v_hours,24);
    if v_session.scheduled_start_utc-now() < make_interval(hours=>v_hours) then
      v_status:='LATE_CANCELLATION';
    else
      v_status:='EARLY_CANCELLATION';
    end if;
  elsif public.is_platform_admin() then
    v_actor:='ADMIN';
    v_status:='CANCELLED';
  else
    raise exception 'session_cancel_not_allowed' using errcode='42501';
  end if;

  v_before:=to_jsonb(v_session);

  update public.sessions
  set status=v_status,
      cancellation_actor=v_actor,
      cancellation_at=now(),
      teacher_note=nullif(trim(coalesce(p_reason,'')),'')
  where id=v_session.id
  returning * into v_session;

  v_entry:=public.ensure_session_billing(v_session.id);

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_state,after_state,reason)
  values(auth.uid(),'SESSION_CANCELLED','session',v_session.id,v_before,to_jsonb(v_session),nullif(trim(coalesce(p_reason,'')),''));

  return jsonb_build_object(
    'session_id',v_session.id,'status',v_session.status,'cancellation_actor',v_actor,
    'billing_entry_id',v_entry.id,'billable',v_entry.id is not null
  );
end;
$$;

create or replace function public.reschedule_session(
  p_session_id uuid,
  p_new_start_utc timestamptz,
  p_teacher_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_session public.sessions;
  v_new public.sessions;
  v_before jsonb;
  v_duration interval;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_new_start_utc is null or p_new_start_utc<=now() then raise exception 'new_start_must_be_future'; end if;

  select * into v_session
  from public.sessions
  where id=p_session_id
  for update;

  if v_session.id is null then raise exception 'session_not_found'; end if;
  if v_session.status<>'SCHEDULED' then raise exception 'session_not_scheduled'; end if;
  if not public.owns_teacher_workspace(v_session.workspace_id) then
    raise exception 'teacher_not_allowed' using errcode='42501';
  end if;

  v_before:=to_jsonb(v_session);
  v_duration:=v_session.scheduled_end_utc-v_session.scheduled_start_utc;

  update public.sessions
  set status='RESCHEDULED',
      teacher_note=nullif(trim(coalesce(p_teacher_note,'')),'')
  where id=v_session.id;

  insert into public.sessions(
    enrollment_id,workspace_id,scheduled_start_utc,scheduled_end_utc,status,
    rescheduled_from_session_id,teacher_note
  ) values(
    v_session.enrollment_id,v_session.workspace_id,p_new_start_utc,p_new_start_utc+v_duration,
    'SCHEDULED',v_session.id,nullif(trim(coalesce(p_teacher_note,'')),'')
  )
  returning * into v_new;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_state,after_state,metadata)
  values(
    auth.uid(),'SESSION_RESCHEDULED','session',v_session.id,v_before,
    jsonb_build_object('status','RESCHEDULED'),
    jsonb_build_object('new_session_id',v_new.id,'new_start_utc',v_new.scheduled_start_utc)
  );

  return jsonb_build_object('old_session_id',v_session.id,'new_session_id',v_new.id,'new_start_utc',v_new.scheduled_start_utc);
end;
$$;

create or replace function public.waive_session_charge(
  p_billing_entry_id uuid,
  p_reason text
)
returns public.session_billing_entries
language plpgsql
security definer
set search_path=public
as $$
declare
  v_entry public.session_billing_entries;
  v_before jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if char_length(trim(coalesce(p_reason,'')))<3 then raise exception 'waiver_reason_required'; end if;

  select * into v_entry
  from public.session_billing_entries
  where id=p_billing_entry_id
  for update;

  if v_entry.id is null then raise exception 'billing_entry_not_found'; end if;
  if v_entry.status<>'DUE' then raise exception 'billing_entry_not_due'; end if;
  if not public.owns_teacher_workspace(v_entry.workspace_id) and not public.is_platform_admin() then
    raise exception 'billing_override_not_allowed' using errcode='42501';
  end if;

  v_before:=to_jsonb(v_entry);

  update public.session_billing_entries
  set status='WAIVED',
      override_reason=trim(p_reason),
      updated_by=auth.uid(),
      paid_at=null
  where id=v_entry.id
  returning * into v_entry;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_state,after_state,reason)
  values(auth.uid(),'SESSION_CHARGE_WAIVED','session_billing_entry',v_entry.id,v_before,to_jsonb(v_entry),trim(p_reason));

  return v_entry;
end;
$$;

create or replace function public.mark_session_charge_paid(
  p_billing_entry_id uuid
)
returns public.session_billing_entries
language plpgsql
security definer
set search_path=public
as $$
declare
  v_entry public.session_billing_entries;
  v_before jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;

  select * into v_entry
  from public.session_billing_entries
  where id=p_billing_entry_id
  for update;

  if v_entry.id is null then raise exception 'billing_entry_not_found'; end if;
  if v_entry.status<>'DUE' then raise exception 'billing_entry_not_due'; end if;
  if not public.owns_teacher_workspace(v_entry.workspace_id) and not public.is_platform_admin() then
    raise exception 'billing_update_not_allowed' using errcode='42501';
  end if;

  v_before:=to_jsonb(v_entry);

  update public.session_billing_entries
  set status='PAID',
      paid_at=now(),
      updated_by=auth.uid()
  where id=v_entry.id
  returning * into v_entry;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_state,after_state)
  values(auth.uid(),'SESSION_CHARGE_PAID','session_billing_entry',v_entry.id,v_before,to_jsonb(v_entry));

  return v_entry;
end;
$$;

revoke all on public.recurring_schedule_rules from anon,authenticated;
revoke all on public.sessions from anon,authenticated;
revoke all on public.session_billing_entries from anon,authenticated;
grant select on public.recurring_schedule_rules to authenticated;
grant select on public.sessions to authenticated;
grant select on public.session_billing_entries to authenticated;

revoke execute on function public.materialize_schedule_rule(uuid,integer) from public,anon;
revoke execute on function public.create_recurring_schedule_rule(uuid,integer,time without time zone,integer,integer) from public,anon;
revoke execute on function public.set_recurring_schedule_rule_active(uuid,boolean) from public,anon;
revoke execute on function public.ensure_session_billing(uuid) from public,anon,authenticated;
revoke execute on function public.finalize_session(uuid,text,text) from public,anon;
revoke execute on function public.cancel_session(uuid,text) from public,anon;
revoke execute on function public.reschedule_session(uuid,timestamptz,text) from public,anon;
revoke execute on function public.waive_session_charge(uuid,text) from public,anon;
revoke execute on function public.mark_session_charge_paid(uuid) from public,anon;

grant execute on function public.materialize_schedule_rule(uuid,integer) to authenticated;
grant execute on function public.create_recurring_schedule_rule(uuid,integer,time without time zone,integer,integer) to authenticated;
grant execute on function public.set_recurring_schedule_rule_active(uuid,boolean) to authenticated;
grant execute on function public.finalize_session(uuid,text,text) to authenticated;
grant execute on function public.cancel_session(uuid,text) to authenticated;
grant execute on function public.reschedule_session(uuid,timestamptz,text) to authenticated;
grant execute on function public.waive_session_charge(uuid,text) to authenticated;
grant execute on function public.mark_session_charge_paid(uuid) to authenticated;

alter table public.recurring_schedule_rules enable row level security;
alter table public.sessions enable row level security;
alter table public.session_billing_entries enable row level security;

drop policy if exists recurring_schedule_rules_select on public.recurring_schedule_rules;
create policy recurring_schedule_rules_select on public.recurring_schedule_rules for select
using(
  public.owns_teacher_workspace(workspace_id)
  or public.is_platform_admin()
  or exists(
    select 1 from public.enrollments e
    where e.id=recurring_schedule_rules.enrollment_id
      and public.is_child_owner(e.student_id)
  )
);

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions for select
using(
  public.owns_teacher_workspace(workspace_id)
  or public.is_platform_admin()
  or exists(
    select 1 from public.enrollments e
    where e.id=sessions.enrollment_id
      and public.is_child_owner(e.student_id)
  )
);

drop policy if exists session_billing_entries_select on public.session_billing_entries;
create policy session_billing_entries_select on public.session_billing_entries for select
using(
  public.owns_teacher_workspace(workspace_id)
  or public.is_platform_admin()
  or exists(
    select 1 from public.enrollments e
    where e.id=session_billing_entries.enrollment_id
      and public.is_child_owner(e.student_id)
  )
);
