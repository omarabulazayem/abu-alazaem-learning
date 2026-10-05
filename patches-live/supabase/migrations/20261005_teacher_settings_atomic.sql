-- V7: atomic teacher workspace + policy settings update.
-- Keeps workspace identity and teacher policies consistent when saved from one form.

create or replace function public.update_teacher_workspace_and_settings(
  p_workspace_id uuid,
  p_display_name text,
  p_timezone text,
  p_late_cancellation_hours integer,
  p_leaderboard_privacy text,
  p_first_place_reward integer,
  p_second_place_reward integer,
  p_third_place_reward integer
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_workspace public.teacher_workspaces;
  v_settings public.teacher_settings;
  v_before jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if not public.owns_teacher_workspace(p_workspace_id) and not public.is_platform_admin() then
    raise exception 'workspace_update_not_allowed' using errcode='42501';
  end if;
  if char_length(trim(coalesce(p_display_name,'')))<2 then
    raise exception 'workspace_name_required';
  end if;
  if not exists(select 1 from pg_timezone_names where name=trim(coalesce(p_timezone,''))) then
    raise exception 'invalid_workspace_timezone';
  end if;
  if coalesce(p_late_cancellation_hours,24) not between 0 and 168 then
    raise exception 'invalid_late_cancellation_hours';
  end if;
  if coalesce(p_leaderboard_privacy,'first_name_initial') not in ('first_name_initial','first_name_only','hidden') then
    raise exception 'invalid_leaderboard_privacy';
  end if;
  if coalesce(p_first_place_reward,0)<0 or coalesce(p_second_place_reward,0)<0 or coalesce(p_third_place_reward,0)<0
     or coalesce(p_first_place_reward,0)>100000
     or coalesce(p_second_place_reward,0)>100000
     or coalesce(p_third_place_reward,0)>100000 then
    raise exception 'invalid_leaderboard_reward';
  end if;

  select * into v_workspace
  from public.teacher_workspaces
  where id=p_workspace_id and status<>'closed'
  for update;

  if v_workspace.id is null then raise exception 'workspace_not_found'; end if;

  select * into v_settings
  from public.teacher_settings
  where workspace_id=p_workspace_id
  for update;

  if v_settings.workspace_id is null then
    insert into public.teacher_settings(
      workspace_id,late_cancellation_hours,leaderboard_privacy,
      first_place_reward,second_place_reward,third_place_reward
    ) values(
      p_workspace_id,coalesce(p_late_cancellation_hours,24),
      coalesce(p_leaderboard_privacy,'first_name_initial'),
      coalesce(p_first_place_reward,0),coalesce(p_second_place_reward,0),
      coalesce(p_third_place_reward,0)
    )
    returning * into v_settings;
  end if;

  v_before=jsonb_build_object('workspace',to_jsonb(v_workspace),'settings',to_jsonb(v_settings));

  update public.teacher_workspaces
  set display_name=trim(p_display_name),
      timezone=trim(p_timezone),
      updated_at=now()
  where id=p_workspace_id
  returning * into v_workspace;

  update public.teacher_settings
  set late_cancellation_hours=coalesce(p_late_cancellation_hours,24),
      leaderboard_privacy=coalesce(p_leaderboard_privacy,'first_name_initial'),
      first_place_reward=coalesce(p_first_place_reward,0),
      second_place_reward=coalesce(p_second_place_reward,0),
      third_place_reward=coalesce(p_third_place_reward,0),
      updated_at=now()
  where workspace_id=p_workspace_id
  returning * into v_settings;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_state,after_state,reason)
  values(
    auth.uid(),
    'TEACHER_WORKSPACE_AND_SETTINGS_UPDATED',
    'teacher_workspace',
    p_workspace_id,
    v_before,
    jsonb_build_object('workspace',to_jsonb(v_workspace),'settings',to_jsonb(v_settings)),
    'Atomic teacher settings save'
  );

  return jsonb_build_object('workspace',v_workspace,'settings',v_settings);
end;
$$;

revoke execute on function public.update_teacher_workspace_and_settings(uuid,text,text,integer,text,integer,integer,integer) from public,anon;
grant execute on function public.update_teacher_workspace_and_settings(uuid,text,text,integer,text,integer,integer,integer) to authenticated;
