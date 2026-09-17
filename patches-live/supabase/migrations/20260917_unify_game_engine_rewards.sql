-- Unify GameEngine completion rewards with the canonical reward ledger.
-- Also retain the latest question type on review_queue so review scheduling
-- preserves the pedagogical context of the child's mistake.

alter table public.review_queue
  add column if not exists last_question_type text;

create or replace function public.record_game_ayah_event(
  p_session_id uuid,
  p_surah_number integer,
  p_ayah_number integer,
  p_question_type text,
  p_is_correct boolean,
  p_used_hint boolean default false,
  p_response_time_ms integer default null,
  p_metadata jsonb default '{}'::jsonb
) returns public.game_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.game_sessions;
  v_question_type text;
begin
  select * into v_session
  from public.game_sessions
  where id = p_session_id;

  if v_session.id is null or auth.uid() is null or not public.is_child_parent(v_session.child_id) then
    raise exception 'not_allowed';
  end if;
  if v_session.completed then
    raise exception 'session_completed';
  end if;
  if p_surah_number < 1 or p_surah_number > 114 or p_ayah_number < 1 then
    raise exception 'invalid_ayah';
  end if;

  v_question_type := coalesce(nullif(trim(p_question_type), ''), 'unknown');

  insert into public.game_ayah_events(
    session_id, child_id, game_id, surah_number, ayah_number,
    question_type, is_correct, used_hint, response_time_ms, metadata
  ) values (
    p_session_id, v_session.child_id, v_session.game_id, p_surah_number, p_ayah_number,
    v_question_type, p_is_correct, coalesce(p_used_hint, false), p_response_time_ms,
    coalesce(p_metadata, '{}'::jsonb)
  );

  update public.game_sessions
  set correct_answers = correct_answers + case when p_is_correct then 1 else 0 end,
      wrong_answers = wrong_answers + case when p_is_correct then 0 else 1 end,
      hints_used = hints_used + case when p_used_hint then 1 else 0 end,
      fast_answers = fast_answers + case
        when p_is_correct and p_response_time_ms is not null and p_response_time_ms <= 5000 then 1
        else 0
      end,
      updated_at = now()
  where id = p_session_id
  returning * into v_session;

  if p_is_correct then
    update public.review_queue
    set correct_recovery_count = correct_recovery_count + 1,
        last_correct_at = now(),
        priority = greatest(1, priority - 1),
        next_review_at = case
          when correct_recovery_count + 1 >= 3 then now() + interval '7 days'
          else now() + interval '2 days'
        end,
        last_game_id = v_session.game_id,
        last_question_type = v_question_type,
        updated_at = now()
    where child_id = v_session.child_id
      and surah_number = p_surah_number
      and ayah_number = p_ayah_number;
  else
    insert into public.review_queue(
      child_id, surah_number, ayah_number, priority, error_count,
      last_error_at, next_review_at, last_game_id, last_question_type
    ) values (
      v_session.child_id, p_surah_number, p_ayah_number, 3, 1,
      now(), now() + interval '12 hours', v_session.game_id, v_question_type
    )
    on conflict(child_id, surah_number, ayah_number) do update
    set priority = least(10, public.review_queue.priority + 2),
        error_count = public.review_queue.error_count + 1,
        last_error_at = now(),
        next_review_at = least(public.review_queue.next_review_at, now() + interval '12 hours'),
        last_game_id = excluded.last_game_id,
        last_question_type = excluded.last_question_type,
        updated_at = now();
  end if;

  return v_session;
end;
$$;

create or replace function public.complete_game_session(
  p_session_id uuid,
  p_elapsed_seconds integer default null,
  p_resume_state jsonb default '{}'::jsonb
) returns public.game_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.game_sessions;
  v_total integer;
  v_accuracy numeric;
  v_score integer;
  v_stars integer;
  v_reward boolean := false;
  v_source_key text;
  v_inserted integer := 0;
begin
  select * into v
  from public.game_sessions
  where id = p_session_id
  for update;

  if v.id is null or auth.uid() is null or not public.is_child_parent(v.child_id) then
    raise exception 'not_allowed';
  end if;
  if v.completed then
    return v;
  end if;

  v_total := v.correct_answers + v.wrong_answers;
  v_accuracy := case when v_total = 0 then 0 else v.correct_answers::numeric / v_total end;
  v_score := greatest(
    0,
    v.correct_answers * 10 + v.fast_answers * 5 - v.hints_used * 3 + 20 +
    case when v_accuracy >= 0.90 then 30 else 0 end
  );
  v_stars := 1
    + case when v_accuracy >= 0.75 then 1 else 0 end
    + case when v_accuracy >= 0.90 and v.hints_used <= 1 then 1 else 0 end;

  -- The reward ledger is now the single authority that mutates points, stars,
  -- streak and achievement triggers. A game earns at most one reward per UTC day.
  v_source_key := 'game:' || v.game_id || ':' || to_char((now() at time zone 'utc')::date, 'YYYY-MM-DD');
  insert into public.reward_ledger(child_id, source_type, source_key, points, stars)
  values(v.child_id, 'game_session', v_source_key, v_score, v_stars)
  on conflict(child_id, source_type, source_key) do nothing;
  get diagnostics v_inserted = row_count;
  v_reward := v_inserted = 1;

  update public.game_sessions
  set score = v_score,
      stars = v_stars,
      completed = true,
      reward_awarded = v_reward,
      earned_rewards = jsonb_build_object(
        'points', case when v_reward then v_score else 0 end,
        'stars', case when v_reward then v_stars else 0 end,
        'accuracy', round(v_accuracy * 100, 1)
      ),
      elapsed_seconds = greatest(elapsed_seconds, coalesce(p_elapsed_seconds, elapsed_seconds)),
      resume_state = coalesce(p_resume_state, '{}'::jsonb),
      completed_at = now(),
      updated_at = now()
  where id = v.id
  returning * into v;

  insert into public.game_progress(
    child_id, game_id, plays, completions, best_score, best_stars,
    total_correct, total_wrong, total_hints, total_seconds, mastery_score,
    last_surah_number, last_played_at, resume_state, updated_at
  ) values (
    v.child_id, v.game_id, 1, 1, v.score, v.stars,
    v.correct_answers, v.wrong_answers, v.hints_used, v.elapsed_seconds,
    round(v_accuracy * 100, 2), v.surah_number, now(), '{}'::jsonb, now()
  )
  on conflict(child_id, game_id) do update
  set plays = public.game_progress.plays + 1,
      completions = public.game_progress.completions + 1,
      best_score = greatest(public.game_progress.best_score, excluded.best_score),
      best_stars = greatest(public.game_progress.best_stars, excluded.best_stars),
      total_correct = public.game_progress.total_correct + excluded.total_correct,
      total_wrong = public.game_progress.total_wrong + excluded.total_wrong,
      total_hints = public.game_progress.total_hints + excluded.total_hints,
      total_seconds = public.game_progress.total_seconds + excluded.total_seconds,
      mastery_score = round((public.game_progress.mastery_score + excluded.mastery_score) / 2, 2),
      last_surah_number = excluded.last_surah_number,
      last_played_at = now(),
      resume_state = '{}'::jsonb,
      updated_at = now();

  return v;
end;
$$;

-- Keep the reward trigger generic so GameEngine rewards receive the same streak
-- and milestone treatment as memorization/review rewards.
create or replace function public.apply_reward_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (new.created_at at time zone 'utc')::date;
  v_previous date;
  v_streak integer;
  v_points integer;
begin
  select max((created_at at time zone 'utc')::date)
    into v_previous
    from public.reward_ledger
   where child_id = new.child_id
     and id <> new.id
     and (created_at at time zone 'utc')::date <= v_today;

  select streak into v_streak
    from public.child_profiles
   where id = new.child_id
   for update;

  if v_previous = v_today then
    v_streak := coalesce(v_streak, 0);
  elsif v_previous = v_today - 1 then
    v_streak := coalesce(v_streak, 0) + 1;
  else
    v_streak := 1;
  end if;

  update public.child_profiles
     set points = points + new.points,
         stars = stars + new.stars,
         streak = v_streak,
         updated_at = now()
   where id = new.child_id
   returning points into v_points;

  insert into public.achievements(child_id, slug)
  values (new.child_id, 'first_steps')
  on conflict(child_id, slug) do nothing;

  case new.source_type
    when 'memorize_session' then
      insert into public.achievements(child_id, slug)
      values (new.child_id, 'first_memorization')
      on conflict(child_id, slug) do nothing;
    when 'review_session' then
      insert into public.achievements(child_id, slug)
      values (new.child_id, 'first_review')
      on conflict(child_id, slug) do nothing;
    when 'memory_game' then
      insert into public.achievements(child_id, slug)
      values (new.child_id, 'memory_player')
      on conflict(child_id, slug) do nothing;
    when 'surah_order_game' then
      insert into public.achievements(child_id, slug)
      values (new.child_id, 'surah_order_master')
      on conflict(child_id, slug) do nothing;
    when 'surah_quiz_game' then
      insert into public.achievements(child_id, slug)
      values (new.child_id, 'surah_quiz_star')
      on conflict(child_id, slug) do nothing;
    when 'game_session' then
      insert into public.achievements(child_id, slug)
      values (new.child_id, 'game_engine_player')
      on conflict(child_id, slug) do nothing;
    else
      null;
  end case;

  if v_points >= 100 then
    insert into public.achievements(child_id, slug)
    values (new.child_id, 'hundred_points')
    on conflict(child_id, slug) do nothing;
  end if;
  if v_points >= 500 then
    insert into public.achievements(child_id, slug)
    values (new.child_id, 'five_hundred_points')
    on conflict(child_id, slug) do nothing;
  end if;
  if v_streak >= 3 then
    insert into public.achievements(child_id, slug)
    values (new.child_id, 'three_day_streak')
    on conflict(child_id, slug) do nothing;
  end if;
  if v_streak >= 7 then
    insert into public.achievements(child_id, slug)
    values (new.child_id, 'seven_day_streak')
    on conflict(child_id, slug) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.record_game_ayah_event(uuid,integer,integer,text,boolean,boolean,integer,jsonb) from public;
revoke all on function public.complete_game_session(uuid,integer,jsonb) from public;
grant execute on function public.record_game_ayah_event(uuid,integer,integer,text,boolean,boolean,integer,jsonb) to authenticated;
grant execute on function public.complete_game_session(uuid,integer,jsonb) to authenticated;
