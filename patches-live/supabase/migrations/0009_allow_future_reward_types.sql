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
         streak = v_streak
   where id = new.child_id
   returning points into v_points;

  insert into public.achievements(child_id, slug)
  values (new.child_id, 'first_steps')
  on conflict (child_id, slug) do nothing;

  case new.source_type
    when 'memorize_session' then
      insert into public.achievements(child_id, slug)
      values (new.child_id, 'first_memorization')
      on conflict (child_id, slug) do nothing;
    when 'review_session' then
      insert into public.achievements(child_id, slug)
      values (new.child_id, 'first_review')
      on conflict (child_id, slug) do nothing;
    when 'memory_game' then
      insert into public.achievements(child_id, slug)
      values (new.child_id, 'memory_player')
      on conflict (child_id, slug) do nothing;
    else
      null;
  end case;

  if v_points >= 100 then
    insert into public.achievements(child_id, slug)
    values (new.child_id, 'hundred_points')
    on conflict (child_id, slug) do nothing;
  end if;

  if v_points >= 500 then
    insert into public.achievements(child_id, slug)
    values (new.child_id, 'five_hundred_points')
    on conflict (child_id, slug) do nothing;
  end if;

  if v_streak >= 3 then
    insert into public.achievements(child_id, slug)
    values (new.child_id, 'three_day_streak')
    on conflict (child_id, slug) do nothing;
  end if;

  if v_streak >= 7 then
    insert into public.achievements(child_id, slug)
    values (new.child_id, 'seven_day_streak')
    on conflict (child_id, slug) do nothing;
  end if;

  return new;
end;
$$;
