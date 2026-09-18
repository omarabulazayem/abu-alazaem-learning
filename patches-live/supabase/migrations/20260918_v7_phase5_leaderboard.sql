-- V7 Phase 5: teacher-scoped weekly leaderboard with immutable Friday close.
-- Week model: Saturday 00:00 through Friday 23:59:59.999999 in Teacher Workspace timezone.

create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.leaderboard_weeks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.teacher_workspaces(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  timezone text not null,
  opens_at_utc timestamptz not null,
  closes_at_utc timestamptz not null,
  status text not null default 'OPEN' check (status in ('OPEN','CLOSED')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(workspace_id,week_start),
  check (week_end = week_start + 6),
  check (closes_at_utc > opens_at_utc)
);
create index if not exists leaderboard_weeks_workspace_status_idx
  on public.leaderboard_weeks(workspace_id,status,week_start desc);
create index if not exists leaderboard_weeks_due_idx
  on public.leaderboard_weeks(status,closes_at_utc)
  where status='OPEN';

create table if not exists public.leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  leaderboard_week_id uuid not null references public.leaderboard_weeks(id) on delete restrict,
  student_id uuid not null references public.child_profiles(id) on delete restrict,
  display_name_snapshot text not null,
  avatar_snapshot text,
  final_score bigint not null default 0,
  rank integer not null check (rank >= 1),
  reward_points integer not null default 0 check (reward_points >= 0),
  created_at timestamptz not null default now(),
  unique(leaderboard_week_id,student_id)
);
create index if not exists leaderboard_snapshots_week_rank_idx
  on public.leaderboard_snapshots(leaderboard_week_id,rank,final_score desc);
create index if not exists leaderboard_snapshots_student_idx
  on public.leaderboard_snapshots(student_id,created_at desc);

create or replace function public.leaderboard_display_name(
  p_display_name text,
  p_privacy text
)
returns text
language plpgsql
immutable
set search_path=public
as $$
declare
  v_parts text[];
  v_first text;
  v_second text;
begin
  v_parts:=regexp_split_to_array(trim(coalesce(p_display_name,'')),'\s+');
  v_first:=coalesce(v_parts[1],'طالب');
  if coalesce(p_privacy,'first_name_initial')='hidden' then
    return 'طالب';
  elsif p_privacy='first_name_only' then
    return v_first;
  end if;
  v_second:=case when array_length(v_parts,1)>=2 then v_parts[2] else null end;
  if v_second is null or v_second='' then return v_first; end if;
  return v_first||' '||left(v_second,1)||'.';
end;
$$;

create or replace function public.ensure_leaderboard_week_for_workspace(
  p_workspace_id uuid,
  p_reference timestamptz default now()
)
returns public.leaderboard_weeks
language plpgsql
security definer
set search_path=public
as $$
declare
  v_workspace public.teacher_workspaces;
  v_local_date date;
  v_week_start date;
  v_week_end date;
  v_week public.leaderboard_weeks;
begin
  select * into v_workspace
  from public.teacher_workspaces
  where id=p_workspace_id and status<>'closed';

  if v_workspace.id is null then raise exception 'workspace_not_found'; end if;
  if not exists(select 1 from pg_timezone_names where name=v_workspace.timezone) then
    raise exception 'invalid_workspace_timezone';
  end if;

  v_local_date:=(p_reference at time zone v_workspace.timezone)::date;
  -- extract(dow): Sunday=0 ... Saturday=6. Saturday is the first day.
  v_week_start:=v_local_date-((extract(dow from v_local_date)::integer+1)%7);
  v_week_end:=v_week_start+6;

  insert into public.leaderboard_weeks(
    workspace_id,week_start,week_end,timezone,opens_at_utc,closes_at_utc,status
  ) values(
    v_workspace.id,v_week_start,v_week_end,v_workspace.timezone,
    (v_week_start::timestamp at time zone v_workspace.timezone),
    ((v_week_end+1)::timestamp at time zone v_workspace.timezone),
    'OPEN'
  )
  on conflict(workspace_id,week_start) do update
    set timezone=excluded.timezone
  returning * into v_week;

  return v_week;
end;
$$;

create or replace function public.prevent_leaderboard_snapshot_mutation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  raise exception 'leaderboard_snapshot_is_immutable' using errcode='55000';
end;
$$;

drop trigger if exists leaderboard_snapshots_immutable on public.leaderboard_snapshots;
create trigger leaderboard_snapshots_immutable
before update or delete on public.leaderboard_snapshots
for each row execute function public.prevent_leaderboard_snapshot_mutation();

create or replace function public.prevent_closed_leaderboard_week_mutation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.status='CLOSED' then
    raise exception 'closed_leaderboard_week_is_immutable' using errcode='55000';
  end if;
  return new;
end;
$$;

drop trigger if exists leaderboard_weeks_closed_immutable on public.leaderboard_weeks;
create trigger leaderboard_weeks_closed_immutable
before update or delete on public.leaderboard_weeks
for each row execute function public.prevent_closed_leaderboard_week_mutation();

create or replace function public.close_leaderboard_week_internal(p_week_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_week public.leaderboard_weeks;
  v_settings public.teacher_settings;
  v_snapshot public.leaderboard_snapshots;
  v_enrollment_id uuid;
begin
  select * into v_week
  from public.leaderboard_weeks
  where id=p_week_id
  for update;

  if v_week.id is null then raise exception 'leaderboard_week_not_found'; end if;
  if v_week.status='CLOSED' then return false; end if;
  if now()<v_week.closes_at_utc then raise exception 'leaderboard_week_not_due'; end if;

  select * into v_settings
  from public.teacher_settings
  where workspace_id=v_week.workspace_id;

  with participants as (
    select e.student_id
    from public.enrollments e
    where e.workspace_id=v_week.workspace_id
      and e.status in ('active','paused')
    union
    select pl.student_id
    from public.point_ledger pl
    where pl.workspace_id=v_week.workspace_id
      and pl.created_at>=v_week.opens_at_utc
      and pl.created_at<v_week.closes_at_utc
  ),
  scores as (
    select
      p.student_id,
      coalesce(sum(pl.weekly_delta) filter (
        where pl.created_at>=v_week.opens_at_utc
          and pl.created_at<v_week.closes_at_utc
          and pl.workspace_id=v_week.workspace_id
      ),0)::bigint as final_score
    from participants p
    left join public.point_ledger pl on pl.student_id=p.student_id
    group by p.student_id
  ),
  ranked as (
    select
      s.student_id,
      s.final_score,
      rank() over(order by s.final_score desc)::integer as competition_rank
    from scores s
  )
  insert into public.leaderboard_snapshots(
    leaderboard_week_id,student_id,display_name_snapshot,avatar_snapshot,
    final_score,rank,reward_points
  )
  select
    v_week.id,
    r.student_id,
    public.leaderboard_display_name(c.display_name,coalesce(v_settings.leaderboard_privacy,'first_name_initial')),
    c.avatar,
    r.final_score,
    r.competition_rank,
    case
      when r.final_score<=0 then 0
      when r.competition_rank=1 then coalesce(v_settings.first_place_reward,0)
      when r.competition_rank=2 then coalesce(v_settings.second_place_reward,0)
      when r.competition_rank=3 then coalesce(v_settings.third_place_reward,0)
      else 0
    end
  from ranked r
  join public.child_profiles c on c.id=r.student_id
  on conflict(leaderboard_week_id,student_id) do nothing;

  -- Weekly podium reward increases Wallet + Lifetime, never Weekly Score.
  for v_snapshot in
    select *
    from public.leaderboard_snapshots
    where leaderboard_week_id=v_week.id
      and reward_points>0
  loop
    select e.id into v_enrollment_id
    from public.enrollments e
    where e.workspace_id=v_week.workspace_id
      and e.student_id=v_snapshot.student_id
    order by
      case e.status when 'active' then 0 when 'paused' then 1 else 2 end,
      e.created_at desc
    limit 1;

    insert into public.point_ledger(
      student_id,enrollment_id,workspace_id,transaction_type,
      wallet_delta,lifetime_delta,weekly_delta,
      source_type,source_id,source_key,idempotency_key,
      reason,metadata
    ) values(
      v_snapshot.student_id,v_enrollment_id,v_week.workspace_id,'WEEKLY_REWARD',
      v_snapshot.reward_points,v_snapshot.reward_points,0,
      'leaderboard_week',v_week.id,
      'leaderboard:'||v_week.id::text||':student:'||v_snapshot.student_id::text,
      'weekly-reward:'||v_week.id::text||':'||v_snapshot.student_id::text,
      'Weekly leaderboard podium reward',
      jsonb_build_object(
        'rank',v_snapshot.rank,
        'final_score',v_snapshot.final_score,
        'reward_points',v_snapshot.reward_points,
        'week_start',v_week.week_start,
        'week_end',v_week.week_end
      )
    )
    on conflict(student_id,idempotency_key) where idempotency_key is not null do nothing;
  end loop;

  update public.leaderboard_weeks
  set status='CLOSED',closed_at=now()
  where id=v_week.id;

  insert into public.audit_logs(
    action,entity_type,entity_id,after_state,metadata
  ) values(
    'LEADERBOARD_WEEK_CLOSED','leaderboard_week',v_week.id,
    jsonb_build_object('status','CLOSED','closed_at',now()),
    jsonb_build_object('workspace_id',v_week.workspace_id,'week_start',v_week.week_start,'week_end',v_week.week_end)
  );

  return true;
end;
$$;

create or replace function public.maintain_leaderboard_weeks()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_workspace record;
  v_week public.leaderboard_weeks;
  v_closed integer:=0;
begin
  for v_workspace in
    select id from public.teacher_workspaces where status='active'
  loop
    perform public.ensure_leaderboard_week_for_workspace(v_workspace.id,now());
  end loop;

  for v_week in
    select *
    from public.leaderboard_weeks
    where status='OPEN' and closes_at_utc<=now()
    order by closes_at_utc
    for update skip locked
  loop
    if public.close_leaderboard_week_internal(v_week.id) then
      v_closed:=v_closed+1;
    end if;
  end loop;

  return v_closed;
end;
$$;

create or replace function public.get_workspace_leaderboard(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_allowed boolean:=false;
  v_week public.leaderboard_weeks;
  v_closed public.leaderboard_weeks;
  v_privacy text:='first_name_initial';
  v_rows jsonb;
  v_closed_rows jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;

  v_allowed :=
    public.owns_teacher_workspace(p_workspace_id)
    or public.is_platform_admin()
    or exists(
      select 1
      from public.enrollments e
      where e.workspace_id=p_workspace_id
        and e.status in ('active','paused')
        and public.is_child_owner(e.student_id)
    );

  if not v_allowed then raise exception 'leaderboard_access_denied' using errcode='42501'; end if;

  v_week:=public.ensure_leaderboard_week_for_workspace(p_workspace_id,now());

  select coalesce(ts.leaderboard_privacy,'first_name_initial')
    into v_privacy
  from public.teacher_settings ts
  where ts.workspace_id=p_workspace_id;

  with participants as (
    select e.student_id
    from public.enrollments e
    where e.workspace_id=p_workspace_id
      and e.status in ('active','paused')
    union
    select pl.student_id
    from public.point_ledger pl
    where pl.workspace_id=p_workspace_id
      and pl.created_at>=v_week.opens_at_utc
      and pl.created_at<v_week.closes_at_utc
  ),
  scores as (
    select
      p.student_id,
      coalesce(sum(pl.weekly_delta) filter (
        where pl.workspace_id=p_workspace_id
          and pl.created_at>=v_week.opens_at_utc
          and pl.created_at<v_week.closes_at_utc
      ),0)::bigint as score
    from participants p
    left join public.point_ledger pl on pl.student_id=p.student_id
    group by p.student_id
  ),
  ranked as (
    select
      s.student_id,
      s.score,
      rank() over(order by s.score desc)::integer as rank
    from scores s
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'student_id',r.student_id,
    'display_name',public.leaderboard_display_name(c.display_name,v_privacy),
    'avatar',c.avatar,
    'score',r.score,
    'rank',r.rank
  ) order by r.rank,r.student_id),'[]'::jsonb)
  into v_rows
  from ranked r
  join public.child_profiles c on c.id=r.student_id;

  select * into v_closed
  from public.leaderboard_weeks
  where workspace_id=p_workspace_id
    and status='CLOSED'
  order by week_start desc
  limit 1;

  if v_closed.id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'student_id',s.student_id,
      'display_name',s.display_name_snapshot,
      'avatar',s.avatar_snapshot,
      'score',s.final_score,
      'rank',s.rank,
      'reward_points',s.reward_points
    ) order by s.rank,s.student_id),'[]'::jsonb)
    into v_closed_rows
    from public.leaderboard_snapshots s
    where s.leaderboard_week_id=v_closed.id;
  else
    v_closed_rows:='[]'::jsonb;
  end if;

  return jsonb_build_object(
    'workspace_id',p_workspace_id,
    'current_week',jsonb_build_object(
      'id',v_week.id,'week_start',v_week.week_start,'week_end',v_week.week_end,
      'timezone',v_week.timezone,'status',v_week.status,'closes_at_utc',v_week.closes_at_utc
    ),
    'standings',v_rows,
    'last_closed_week',case when v_closed.id is null then null else jsonb_build_object(
      'id',v_closed.id,'week_start',v_closed.week_start,'week_end',v_closed.week_end,
      'timezone',v_closed.timezone,'closed_at',v_closed.closed_at
    ) end,
    'last_closed_standings',v_closed_rows
  );
end;
$$;

revoke all on public.leaderboard_weeks from anon,authenticated;
revoke all on public.leaderboard_snapshots from anon,authenticated;
grant select on public.leaderboard_weeks to authenticated;
grant select on public.leaderboard_snapshots to authenticated;

revoke execute on function public.leaderboard_display_name(text,text) from public,anon;
revoke execute on function public.ensure_leaderboard_week_for_workspace(uuid,timestamptz) from public,anon,authenticated;
revoke execute on function public.prevent_leaderboard_snapshot_mutation() from public,anon,authenticated;
revoke execute on function public.prevent_closed_leaderboard_week_mutation() from public,anon,authenticated;
revoke execute on function public.close_leaderboard_week_internal(uuid) from public,anon,authenticated;
revoke execute on function public.maintain_leaderboard_weeks() from public,anon,authenticated;
revoke execute on function public.get_workspace_leaderboard(uuid) from public,anon;
grant execute on function public.get_workspace_leaderboard(uuid) to authenticated;

alter table public.leaderboard_weeks enable row level security;
alter table public.leaderboard_snapshots enable row level security;

drop policy if exists leaderboard_weeks_select on public.leaderboard_weeks;
create policy leaderboard_weeks_select on public.leaderboard_weeks for select
using(
  public.owns_teacher_workspace(workspace_id)
  or public.is_platform_admin()
  or exists(
    select 1
    from public.enrollments e
    where e.workspace_id=leaderboard_weeks.workspace_id
      and e.status in ('active','paused')
      and public.is_child_owner(e.student_id)
  )
);

drop policy if exists leaderboard_snapshots_select on public.leaderboard_snapshots;
create policy leaderboard_snapshots_select on public.leaderboard_snapshots for select
using(
  exists(
    select 1
    from public.leaderboard_weeks w
    where w.id=leaderboard_snapshots.leaderboard_week_id
      and (
        public.owns_teacher_workspace(w.workspace_id)
        or public.is_platform_admin()
        or exists(
          select 1
          from public.enrollments e
          where e.workspace_id=w.workspace_id
            and e.status in ('active','paused')
            and public.is_child_owner(e.student_id)
        )
      )
  )
);

-- Database-side scheduler: ensure current weeks and close due Friday windows automatically.
do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname='v7-leaderboard-maintenance'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'v7-leaderboard-maintenance',
    '*/5 * * * *',
    'select public.maintain_leaderboard_weeks();'
  );
end;
$$;
