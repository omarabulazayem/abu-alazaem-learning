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
    values (new.child_id, 'first_steps')
    on conflict (child_id, slug) do nothing;
  end if;

  if new.memorized_percent >= 100 then
    insert into public.achievements(child_id, slug)
    values (new.child_id, 'first_surah')
    on conflict (child_id, slug) do nothing;

    select count(*) into v_completed
      from public.learning_progress
     where child_id = new.child_id
       and memorized_percent >= 100;

    if v_completed >= 5 then
      insert into public.achievements(child_id, slug)
      values (new.child_id, 'five_surahs')
      on conflict (child_id, slug) do nothing;
    end if;
  end if;

  return new;
end;
$$;

insert into public.achievements(child_id, slug, unlocked_at)
select child_id, 'first_steps', min(unlocked_at)
from public.achievements
where slug in ('first_step','first_session')
group by child_id
on conflict (child_id, slug) do nothing;

insert into public.achievements(child_id, slug, unlocked_at)
select child_id, 'hundred_points', min(unlocked_at)
from public.achievements
where slug = 'points_100'
group by child_id
on conflict (child_id, slug) do nothing;

insert into public.achievements(child_id, slug, unlocked_at)
select child_id, 'three_day_streak', min(unlocked_at)
from public.achievements
where slug = 'streak_3'
group by child_id
on conflict (child_id, slug) do nothing;

insert into public.achievements(child_id, slug, unlocked_at)
select child_id, 'seven_day_streak', min(unlocked_at)
from public.achievements
where slug = 'streak_7'
group by child_id
on conflict (child_id, slug) do nothing;

delete from public.achievements
where slug in ('first_step','first_session','points_100','streak_3','streak_7');
