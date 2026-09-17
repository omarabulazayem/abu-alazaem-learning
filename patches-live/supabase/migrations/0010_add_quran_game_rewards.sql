create or replace function public.claim_learning_reward(p_child_id uuid, p_event text, p_source_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
  v_stars integer;
  v_inserted integer;
  v_today text := to_char((now() at time zone 'utc')::date, 'YYYY-MM-DD');
  v_parts text[];
  v_surah integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if public.is_child_parent(p_child_id) then
    null;
  elsif p_event = 'review_session' and public.is_child_teacher(p_child_id) then
    null;
  else
    raise exception 'Not allowed to reward this child' using errcode = '42501';
  end if;

  v_parts := string_to_array(trim(coalesce(p_source_key, '')), ':');

  case p_event
    when 'memorize_session' then
      if array_length(v_parts, 1) <> 3 or v_parts[1] <> 'memorize' or v_parts[3] <> v_today or v_parts[2] !~ '^[0-9]{1,3}$' then raise exception 'Invalid memorize reward source key'; end if;
      v_surah := v_parts[2]::integer;
      if v_surah < 1 or v_surah > 114 then raise exception 'Invalid surah number'; end if;
      if not exists (select 1 from public.learning_progress lp where lp.child_id = p_child_id and lp.surah_number = v_surah and lp.last_activity_at >= now() - interval '10 minutes') then raise exception 'A recent memorization session is required'; end if;
      v_points := 20; v_stars := 1;
    when 'review_session' then
      if array_length(v_parts, 1) <> 3 or v_parts[1] <> 'review' or v_parts[3] <> v_today or v_parts[2] !~ '^[0-9]{1,3}$' then raise exception 'Invalid review reward source key'; end if;
      v_surah := v_parts[2]::integer;
      if v_surah < 1 or v_surah > 114 then raise exception 'Invalid surah number'; end if;
      if not exists (select 1 from public.review_events re where re.child_id = p_child_id and re.surah_number = v_surah and re.created_by = auth.uid() and re.reviewed_at >= now() - interval '10 minutes') then raise exception 'A recent review session is required'; end if;
      v_points := 15; v_stars := 1;
    when 'memory_game' then
      if array_length(v_parts, 1) <> 2 or v_parts[1] <> 'memory' or v_parts[2] <> v_today then raise exception 'Invalid memory game reward source key'; end if;
      v_points := 35; v_stars := 2;
    when 'surah_order_game' then
      if array_length(v_parts, 1) <> 2 or v_parts[1] <> 'order' or v_parts[2] <> v_today then raise exception 'Invalid surah order reward source key'; end if;
      v_points := 30; v_stars := 1;
    when 'surah_quiz_game' then
      if array_length(v_parts, 1) <> 2 or v_parts[1] <> 'quiz' or v_parts[2] <> v_today then raise exception 'Invalid surah quiz reward source key'; end if;
      v_points := 25; v_stars := 1;
    else
      raise exception 'Unknown reward event';
  end case;

  insert into public.reward_ledger(child_id, source_type, source_key, points, stars)
  values (p_child_id, p_event, p_source_key, v_points, v_stars)
  on conflict (child_id, source_type, source_key) do nothing;
  get diagnostics v_inserted = row_count;

  return jsonb_build_object('awarded', v_inserted = 1, 'points', case when v_inserted = 1 then v_points else 0 end, 'stars', case when v_inserted = 1 then v_stars else 0 end);
end;
$$;

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
  select max((created_at at time zone 'utc')::date) into v_previous from public.reward_ledger where child_id = new.child_id and id <> new.id and (created_at at time zone 'utc')::date <= v_today;
  select streak into v_streak from public.child_profiles where id = new.child_id for update;
  if v_previous = v_today then v_streak := coalesce(v_streak, 0); elsif v_previous = v_today - 1 then v_streak := coalesce(v_streak, 0) + 1; else v_streak := 1; end if;
  update public.child_profiles set points = points + new.points, stars = stars + new.stars, streak = v_streak where id = new.child_id returning points into v_points;
  insert into public.achievements(child_id, slug) values (new.child_id, 'first_steps') on conflict (child_id, slug) do nothing;
  case new.source_type
    when 'memorize_session' then insert into public.achievements(child_id, slug) values (new.child_id, 'first_memorization') on conflict (child_id, slug) do nothing;
    when 'review_session' then insert into public.achievements(child_id, slug) values (new.child_id, 'first_review') on conflict (child_id, slug) do nothing;
    when 'memory_game' then insert into public.achievements(child_id, slug) values (new.child_id, 'memory_player') on conflict (child_id, slug) do nothing;
    when 'surah_order_game' then insert into public.achievements(child_id, slug) values (new.child_id, 'surah_order_master') on conflict (child_id, slug) do nothing;
    when 'surah_quiz_game' then insert into public.achievements(child_id, slug) values (new.child_id, 'surah_quiz_star') on conflict (child_id, slug) do nothing;
    else null;
  end case;
  if v_points >= 100 then insert into public.achievements(child_id, slug) values (new.child_id, 'hundred_points') on conflict (child_id, slug) do nothing; end if;
  if v_points >= 500 then insert into public.achievements(child_id, slug) values (new.child_id, 'five_hundred_points') on conflict (child_id, slug) do nothing; end if;
  if v_streak >= 3 then insert into public.achievements(child_id, slug) values (new.child_id, 'three_day_streak') on conflict (child_id, slug) do nothing; end if;
  if v_streak >= 7 then insert into public.achievements(child_id, slug) values (new.child_id, 'seven_day_streak') on conflict (child_id, slug) do nothing; end if;
  return new;
end;
$$;