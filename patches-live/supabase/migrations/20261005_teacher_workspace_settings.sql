-- V7: validated teacher workspace identity/settings update.
-- Replaces direct table updates for display name/timezone with an auditable RPC.

create or replace function public.update_teacher_workspace_settings(
  p_workspace_id uuid,
  p_display_name text,
  p_timezone text
)
returns public.teacher_workspaces
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row public.teacher_workspaces;
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

  select * into v_row from public.teacher_workspaces
  where id=p_workspace_id
  for update;

  if v_row.id is null then raise exception 'workspace_not_found'; end if;
  v_before:=to_jsonb(v_row);

  update public.teacher_workspaces
  set display_name=trim(p_display_name),
      timezone=trim(p_timezone),
      updated_at=now()
  where id=p_workspace_id
  returning * into v_row;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_state,after_state,reason)
  values(auth.uid(),'TEACHER_WORKSPACE_SETTINGS_UPDATED','teacher_workspace',v_row.id,v_before,to_jsonb(v_row),'Teacher workspace settings');

  return v_row;
end;
$$;

revoke update(display_name,timezone) on public.teacher_workspaces from authenticated;
revoke execute on function public.update_teacher_workspace_settings(uuid,text,text) from public,anon;
grant execute on function public.update_teacher_workspace_settings(uuid,text,text) to authenticated;
