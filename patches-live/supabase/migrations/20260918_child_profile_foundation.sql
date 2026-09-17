-- Production child profile foundation.
-- Keep durable identity/customization on child_profiles and derive learning/game
-- collections from their canonical tables instead of duplicating them as JSON.

alter table public.child_profiles
  add column if not exists age_years smallint check (age_years is null or age_years between 3 and 18),
  add column if not exists gender text not null default 'unspecified' check (gender in ('male','female','unspecified')),
  add column if not exists customization jsonb not null default '{}'::jsonb,
  add column if not exists last_activity_at timestamptz;

-- Existing age_band remains supported for age-aware UX. Do not invent an exact
-- age for existing children; age_years stays NULL until the parent supplies it.

create or replace function public.touch_child_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_child_id uuid;
  v_activity timestamptz;
begin
  v_row := to_jsonb(new);
  v_child_id := nullif(v_row->>'child_id', '')::uuid;
  v_activity := coalesce(
    nullif(v_row->>'last_activity_at', '')::timestamptz,
    nullif(v_row->>'reviewed_at', '')::timestamptz,
    nullif(v_row->>'created_at', '')::timestamptz,
    now()
  );

  if v_child_id is null then
    return new;
  end if;

  update public.child_profiles
     set last_activity_at = greatest(coalesce(last_activity_at, v_activity), v_activity),
         updated_at = now()
   where id = v_child_id;
  return new;
end;
$$;

drop trigger if exists learning_progress_touch_child on public.learning_progress;
create trigger learning_progress_touch_child
after insert or update of memorized_percent, review_percent, status, last_activity_at on public.learning_progress
for each row execute function public.touch_child_activity();

drop trigger if exists review_events_touch_child on public.review_events;
create trigger review_events_touch_child
after insert on public.review_events
for each row execute function public.touch_child_activity();

drop trigger if exists reward_ledger_touch_child on public.reward_ledger;
create trigger reward_ledger_touch_child
after insert on public.reward_ledger
for each row execute function public.touch_child_activity();

drop trigger if exists game_events_touch_child on public.game_ayah_events;
create trigger game_events_touch_child
after insert on public.game_ayah_events
for each row execute function public.touch_child_activity();

-- Backfill last_activity_at from real historical activity only.
with activity as (
  select child_id, max(ts) as last_activity_at
  from (
    select child_id, max(last_activity_at) as ts from public.learning_progress group by child_id
    union all
    select child_id, max(reviewed_at) as ts from public.review_events group by child_id
    union all
    select child_id, max(created_at) as ts from public.reward_ledger group by child_id
    union all
    select child_id, max(created_at) as ts from public.game_ayah_events group by child_id
  ) events
  group by child_id
)
update public.child_profiles child
   set last_activity_at = activity.last_activity_at
  from activity
 where child.id = activity.child_id
   and (child.last_activity_at is null or child.last_activity_at < activity.last_activity_at);

revoke all on function public.touch_child_activity() from public, anon, authenticated;
