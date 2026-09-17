-- Allow a child/parent flow to explicitly discard an unfinished GameEngine session
-- before starting a fresh round. Abandoned sessions earn no reward and do not
-- update game_progress; they are closed only so latestIncomplete() stays clean.

create or replace function public.abandon_game_session(p_session_id uuid)
returns public.game_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.game_sessions;
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

  update public.game_sessions
     set completed = true,
         completed_at = now(),
         updated_at = now(),
         resume_state = '{}'::jsonb,
         earned_rewards = jsonb_build_object('abandoned', true),
         reward_awarded = false
   where id = p_session_id
   returning * into v;

  return v;
end;
$$;

revoke all on function public.abandon_game_session(uuid) from public, anon;
grant execute on function public.abandon_game_session(uuid) to authenticated;
