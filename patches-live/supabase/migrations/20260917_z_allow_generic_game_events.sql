-- GameEngine must support both Quran ayah questions and general educational
-- questions (surah order, metadata quizzes, symbol memory) without inventing a
-- fake ayah. Keep the existing event table for compatibility but make Quran
-- references optional; review_queue is touched only when both references exist.

alter table public.game_ayah_events
  alter column surah_number drop not null,
  alter column ayah_number drop not null;

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
  v_has_ayah boolean;
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
  if p_surah_number is not null and (p_surah_number < 1 or p_surah_number > 114) then
    raise exception 'invalid_surah';
  end if;
  if p_ayah_number is not null and p_ayah_number < 1 then
    raise exception 'invalid_ayah';
  end if;
  if p_ayah_number is not null and p_surah_number is null then
    raise exception 'ayah_requires_surah';
  end if;

  v_question_type := coalesce(nullif(trim(p_question_type), ''), 'unknown');
  v_has_ayah := p_surah_number is not null and p_ayah_number is not null;

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

  if not v_has_ayah then
    return v_session;
  end if;

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

revoke all on function public.record_game_ayah_event(uuid,integer,integer,text,boolean,boolean,integer,jsonb) from public;
grant execute on function public.record_game_ayah_event(uuid,integer,integer,text,boolean,boolean,integer,jsonb) to authenticated;
