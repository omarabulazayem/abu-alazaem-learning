-- Security hardening for GameEngine RPCs.
-- Later function replacements can restore PostgreSQL's default EXECUTE grant to PUBLIC,
-- which makes SECURITY DEFINER RPCs callable through the anon role. Keep the public API
-- surface authenticated-only while each function continues to enforce child ownership.

revoke all on function public.start_game_session(uuid,text,text,text,text,integer,integer[]) from anon, public;
revoke all on function public.save_game_state(uuid,jsonb,integer) from anon, public;
revoke all on function public.record_game_ayah_event(uuid,integer,integer,text,boolean,boolean,integer,jsonb) from anon, public;
revoke all on function public.complete_game_session(uuid,integer,jsonb) from anon, public;
revoke all on function public.abandon_game_session(uuid) from anon, public;

grant execute on function public.start_game_session(uuid,text,text,text,text,integer,integer[]) to authenticated;
grant execute on function public.save_game_state(uuid,jsonb,integer) to authenticated;
grant execute on function public.record_game_ayah_event(uuid,integer,integer,text,boolean,boolean,integer,jsonb) to authenticated;
grant execute on function public.complete_game_session(uuid,integer,jsonb) to authenticated;
grant execute on function public.abandon_game_session(uuid) to authenticated;
