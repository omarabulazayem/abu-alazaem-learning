-- Real gamification: daily streaks and automatic achievements.
-- All writes happen from database triggers, never directly from the browser.

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

  select streak into v_streak from public.child_profiles where id = new.child_id for update;

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
  values (new.child_id, 'first_session')
  on conflict (child_id, slug) do nothing;

  if v_points >= 100 then
    insert into public.achievements(child_id, slug)
    values (new.child_id, 'points_100')
    on conflict (child_id, slug) do nothing;
  end if;

  if v_streak >= 3 then
    insert into public.achievements(child_id, slug)
    values (new.child_id, 'streak_3')
    on conflict (child_id, slug) do nothing;
  end if;

  if v_streak >= 7 then
    insert into public.achievements(child_id, slug)
    values (new.child_id, 'streak_7')
    on conflict (child_id, slug) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.sync_progress_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed integer;
begin
  if new.memorized_percent > 0 then
    insert into public.achievements(child_id, slug)
    values (new.child_id, 'first_step')
    on conflict (child_id, slug) do nothing;
  end if;

  if new.memorized_percent >= 100 then
    insert into public.achievements(child_id, slug)
    values (new.child_id, 'first_surah')
    on conflict (child_id, slug) do nothing;

    select count(*) into v_completed
      from public.learning_progress
     where child_id = new.child_id and memorized_percent >= 100;

    if v_completed >= 5 then
      insert into public.achievements(child_id, slug)
      values (new.child_id, 'five_surahs')
      on conflict (child_id, slug) do nothing;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.sync_review_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.achievements(child_id, slug)
  values (new.child_id, 'first_review')
  on conflict (child_id, slug) do nothing;
  return new;
end;
$$;

drop trigger if exists progress_achievement_sync on public.learning_progress;
create trigger progress_achievement_sync
after insert or update of memorized_percent on public.learning_progress
for each row execute function public.sync_progress_achievements();

drop trigger if exists review_achievement_sync on public.review_events;
create trigger review_achievement_sync
after insert on public.review_events
for each row execute function public.sync_review_achievements();

revoke all on function public.apply_reward_ledger() from public, anon, authenticated;
revoke all on function public.sync_progress_achievements() from public, anon, authenticated;
revoke all on function public.sync_review_achievements() from public, anon, authenticated;

insert into public.achievements(child_id, slug)
select distinct child_id, 'first_step' from public.learning_progress where memorized_percent > 0
on conflict (child_id, slug) do nothing;
insert into public.achievements(child_id, slug)
select distinct child_id, 'first_surah' from public.learning_progress where memorized_percent >= 100
on conflict (child_id, slug) do nothing;
insert into public.achievements(child_id, slug)
select distinct child_id, 'first_review' from public.review_events
on conflict (child_id, slug) do nothing;
insert into public.achievements(child_id, slug)
select id, 'points_100' from public.child_profiles where points >= 100
on conflict (child_id, slug) do nothing;
