-- Abu Al-Azaem Quran Game Engine core
-- Applied to Supabase project ksadinnwokbxpwmfzzqx on 2026-09-17.
-- Gameplay writes go through SECURITY DEFINER RPCs that validate the parent/child relationship.

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  game_id text not null,
  game_name text,
  game_type text,
  difficulty text not null default 'easy' check (difficulty in ('easy','medium','hard','advanced')),
  surah_number integer check (surah_number between 1 and 114),
  selected_ayahs integer[] not null default '{}',
  score integer not null default 0 check (score >= 0),
  stars integer not null default 0 check (stars between 0 and 3),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  wrong_answers integer not null default 0 check (wrong_answers >= 0),
  hints_used integer not null default 0 check (hints_used >= 0),
  fast_answers integer not null default 0 check (fast_answers >= 0),
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  attempts integer not null default 1 check (attempts >= 1),
  completed boolean not null default false,
  reward_awarded boolean not null default false,
  earned_rewards jsonb not null default '{}'::jsonb,
  resume_state jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists game_sessions_child_idx on public.game_sessions(child_id, started_at desc);
create index if not exists game_sessions_game_idx on public.game_sessions(child_id, game_id, started_at desc);

create table if not exists public.game_ayah_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  game_id text not null,
  surah_number integer not null check (surah_number between 1 and 114),
  ayah_number integer not null check (ayah_number > 0),
  question_type text not null,
  is_correct boolean not null,
  used_hint boolean not null default false,
  response_time_ms integer check (response_time_ms is null or response_time_ms >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists game_ayah_events_child_idx on public.game_ayah_events(child_id, created_at desc);
create index if not exists game_ayah_events_ayah_idx on public.game_ayah_events(child_id, surah_number, ayah_number, created_at desc);

create table if not exists public.game_progress (
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  game_id text not null,
  plays integer not null default 0,
  completions integer not null default 0,
  best_score integer not null default 0,
  best_stars integer not null default 0,
  total_correct integer not null default 0,
  total_wrong integer not null default 0,
  total_hints integer not null default 0,
  total_seconds integer not null default 0,
  mastery_score numeric(5,2) not null default 0,
  last_surah_number integer,
  last_played_at timestamptz,
  resume_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (child_id, game_id)
);

create table if not exists public.review_queue (
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  surah_number integer not null check (surah_number between 1 and 114),
  ayah_number integer not null check (ayah_number > 0),
  priority integer not null default 1 check (priority between 1 and 10),
  error_count integer not null default 0 check (error_count >= 0),
  correct_recovery_count integer not null default 0 check (correct_recovery_count >= 0),
  last_error_at timestamptz,
  last_correct_at timestamptz,
  next_review_at timestamptz not null default now(),
  last_game_id text,
  updated_at timestamptz not null default now(),
  primary key (child_id, surah_number, ayah_number)
);
create index if not exists review_queue_due_idx on public.review_queue(child_id, next_review_at, priority desc);

alter table public.game_sessions enable row level security;
alter table public.game_ayah_events enable row level security;
alter table public.game_progress enable row level security;
alter table public.review_queue enable row level security;

drop policy if exists game_sessions_related_select on public.game_sessions;
create policy game_sessions_related_select on public.game_sessions for select to authenticated using (public.is_child_parent(child_id) or public.is_child_teacher(child_id));
drop policy if exists game_ayah_events_related_select on public.game_ayah_events;
create policy game_ayah_events_related_select on public.game_ayah_events for select to authenticated using (public.is_child_parent(child_id) or public.is_child_teacher(child_id));
drop policy if exists game_progress_related_select on public.game_progress;
create policy game_progress_related_select on public.game_progress for select to authenticated using (public.is_child_parent(child_id) or public.is_child_teacher(child_id));
drop policy if exists review_queue_related_select on public.review_queue;
create policy review_queue_related_select on public.review_queue for select to authenticated using (public.is_child_parent(child_id) or public.is_child_teacher(child_id));

revoke insert, update, delete on public.game_sessions from authenticated;
revoke insert, update, delete on public.game_ayah_events from authenticated;
revoke insert, update, delete on public.game_progress from authenticated;
revoke insert, update, delete on public.review_queue from authenticated;
grant select on public.game_sessions, public.game_ayah_events, public.game_progress, public.review_queue to authenticated;

create or replace function public.start_game_session(
  p_child_id uuid, p_game_id text, p_game_name text default null, p_game_type text default null,
  p_difficulty text default 'easy', p_surah_number integer default null, p_selected_ayahs integer[] default '{}'
) returns public.game_sessions
language plpgsql security definer set search_path = public as $$
declare v_row public.game_sessions;
begin
  if auth.uid() is null or not public.is_child_parent(p_child_id) then raise exception 'not_allowed'; end if;
  if coalesce(trim(p_game_id),'') = '' then raise exception 'invalid_game'; end if;
  if p_difficulty not in ('easy','medium','hard','advanced') then raise exception 'invalid_difficulty'; end if;
  insert into public.game_sessions(child_id,game_id,game_name,game_type,difficulty,surah_number,selected_ayahs)
  values(p_child_id,p_game_id,p_game_name,p_game_type,p_difficulty,p_surah_number,coalesce(p_selected_ayahs,'{}')) returning * into v_row;
  return v_row;
end $$;

create or replace function public.save_game_state(p_session_id uuid,p_resume_state jsonb,p_elapsed_seconds integer default null)
returns public.game_sessions language plpgsql security definer set search_path = public as $$
declare v_row public.game_sessions;
begin
  select * into v_row from public.game_sessions where id=p_session_id;
  if v_row.id is null or auth.uid() is null or not public.is_child_parent(v_row.child_id) then raise exception 'not_allowed'; end if;
  if v_row.completed then return v_row; end if;
  update public.game_sessions set resume_state=coalesce(p_resume_state,'{}'),elapsed_seconds=greatest(elapsed_seconds,coalesce(p_elapsed_seconds,elapsed_seconds)),updated_at=now() where id=p_session_id returning * into v_row;
  update public.game_progress set resume_state=v_row.resume_state,last_played_at=now(),updated_at=now() where child_id=v_row.child_id and game_id=v_row.game_id;
  return v_row;
end $$;

create or replace function public.record_game_ayah_event(
  p_session_id uuid,p_surah_number integer,p_ayah_number integer,p_question_type text,p_is_correct boolean,
  p_used_hint boolean default false,p_response_time_ms integer default null,p_metadata jsonb default '{}'::jsonb
) returns public.game_sessions language plpgsql security definer set search_path = public as $$
declare v_session public.game_sessions;
begin
  select * into v_session from public.game_sessions where id=p_session_id;
  if v_session.id is null or auth.uid() is null or not public.is_child_parent(v_session.child_id) then raise exception 'not_allowed'; end if;
  if v_session.completed then raise exception 'session_completed'; end if;
  if p_surah_number < 1 or p_surah_number > 114 or p_ayah_number < 1 then raise exception 'invalid_ayah'; end if;
  insert into public.game_ayah_events(session_id,child_id,game_id,surah_number,ayah_number,question_type,is_correct,used_hint,response_time_ms,metadata)
  values(p_session_id,v_session.child_id,v_session.game_id,p_surah_number,p_ayah_number,coalesce(nullif(trim(p_question_type),''),'unknown'),p_is_correct,coalesce(p_used_hint,false),p_response_time_ms,coalesce(p_metadata,'{}'));
  update public.game_sessions set
    correct_answers=correct_answers+case when p_is_correct then 1 else 0 end,
    wrong_answers=wrong_answers+case when p_is_correct then 0 else 1 end,
    hints_used=hints_used+case when p_used_hint then 1 else 0 end,
    fast_answers=fast_answers+case when p_is_correct and p_response_time_ms is not null and p_response_time_ms<=5000 then 1 else 0 end,
    updated_at=now()
  where id=p_session_id returning * into v_session;
  if p_is_correct then
    update public.review_queue set correct_recovery_count=correct_recovery_count+1,last_correct_at=now(),priority=greatest(1,priority-1),next_review_at=case when correct_recovery_count+1>=3 then now()+interval '7 days' else now()+interval '2 days' end,last_game_id=v_session.game_id,updated_at=now()
    where child_id=v_session.child_id and surah_number=p_surah_number and ayah_number=p_ayah_number;
  else
    insert into public.review_queue(child_id,surah_number,ayah_number,priority,error_count,last_error_at,next_review_at,last_game_id)
    values(v_session.child_id,p_surah_number,p_ayah_number,3,1,now(),now()+interval '12 hours',v_session.game_id)
    on conflict(child_id,surah_number,ayah_number) do update set priority=least(10,public.review_queue.priority+2),error_count=public.review_queue.error_count+1,last_error_at=now(),next_review_at=least(public.review_queue.next_review_at,now()+interval '12 hours'),last_game_id=excluded.last_game_id,updated_at=now();
  end if;
  return v_session;
end $$;

create or replace function public.complete_game_session(p_session_id uuid,p_elapsed_seconds integer default null,p_resume_state jsonb default '{}'::jsonb)
returns public.game_sessions language plpgsql security definer set search_path = public as $$
declare v public.game_sessions; v_total integer; v_accuracy numeric; v_score integer; v_stars integer; v_reward boolean;
begin
  select * into v from public.game_sessions where id=p_session_id for update;
  if v.id is null or auth.uid() is null or not public.is_child_parent(v.child_id) then raise exception 'not_allowed'; end if;
  if v.completed then return v; end if;
  v_total:=v.correct_answers+v.wrong_answers;
  v_accuracy:=case when v_total=0 then 0 else v.correct_answers::numeric/v_total end;
  v_score:=greatest(0,v.correct_answers*10+v.fast_answers*5-v.hints_used*3+20+case when v_accuracy>=0.90 then 30 else 0 end);
  v_stars:=1+case when v_accuracy>=0.75 then 1 else 0 end+case when v_accuracy>=0.90 and v.hints_used<=1 then 1 else 0 end;
  select not exists(select 1 from public.game_sessions x where x.child_id=v.child_id and x.game_id=v.game_id and x.reward_awarded=true and x.completed_at>=date_trunc('day',now()) and x.id<>v.id) into v_reward;
  update public.game_sessions set score=v_score,stars=v_stars,completed=true,reward_awarded=v_reward,earned_rewards=jsonb_build_object('points',case when v_reward then v_score else 0 end,'stars',case when v_reward then v_stars else 0 end,'accuracy',round(v_accuracy*100,1)),elapsed_seconds=greatest(elapsed_seconds,coalesce(p_elapsed_seconds,elapsed_seconds)),resume_state=coalesce(p_resume_state,'{}'),completed_at=now(),updated_at=now() where id=v.id returning * into v;
  insert into public.game_progress(child_id,game_id,plays,completions,best_score,best_stars,total_correct,total_wrong,total_hints,total_seconds,mastery_score,last_surah_number,last_played_at,resume_state,updated_at)
  values(v.child_id,v.game_id,1,1,v.score,v.stars,v.correct_answers,v.wrong_answers,v.hints_used,v.elapsed_seconds,round(v_accuracy*100,2),v.surah_number,now(),'{}',now())
  on conflict(child_id,game_id) do update set plays=public.game_progress.plays+1,completions=public.game_progress.completions+1,best_score=greatest(public.game_progress.best_score,excluded.best_score),best_stars=greatest(public.game_progress.best_stars,excluded.best_stars),total_correct=public.game_progress.total_correct+excluded.total_correct,total_wrong=public.game_progress.total_wrong+excluded.total_wrong,total_hints=public.game_progress.total_hints+excluded.total_hints,total_seconds=public.game_progress.total_seconds+excluded.total_seconds,mastery_score=round((public.game_progress.mastery_score+excluded.mastery_score)/2,2),last_surah_number=excluded.last_surah_number,last_played_at=now(),resume_state='{}',updated_at=now();
  if v_reward then update public.child_profiles set points=coalesce(points,0)+v.score,stars=coalesce(stars,0)+v.stars,updated_at=now() where id=v.child_id; end if;
  return v;
end $$;

revoke all on function public.start_game_session(uuid,text,text,text,text,integer,integer[]) from public;
revoke all on function public.save_game_state(uuid,jsonb,integer) from public;
revoke all on function public.record_game_ayah_event(uuid,integer,integer,text,boolean,boolean,integer,jsonb) from public;
revoke all on function public.complete_game_session(uuid,integer,jsonb) from public;
grant execute on function public.start_game_session(uuid,text,text,text,text,integer,integer[]) to authenticated;
grant execute on function public.save_game_state(uuid,jsonb,integer) to authenticated;
grant execute on function public.record_game_ayah_event(uuid,integer,integer,text,boolean,boolean,integer,jsonb) to authenticated;
grant execute on function public.complete_game_session(uuid,integer,jsonb) to authenticated;
