-- V7: in-app parent invite notifications for already-registered parents.
-- The invite token is deliberately not placed in notification metadata.

create or replace function public.notify_parent_invite_created()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_parent uuid;
  v_teacher_name text;
  v_workspace_name text;
begin
  select p.id into v_parent
  from auth.users u
  join public.profiles p on p.id=u.id
  where p.account_type='parent'
    and lower(coalesce(u.email,''))=lower(trim(new.invited_email))
  limit 1;

  if v_parent is null then
    return new;
  end if;

  select p.display_name into v_teacher_name
  from public.profiles p
  where p.id=new.invited_by;

  select w.display_name into v_workspace_name
  from public.teacher_workspaces w
  where w.id=new.workspace_id;

  perform public.create_notification(
    v_parent,
    'PARENT_INVITE',
    'لديك دعوة من معلم',
    coalesce(v_teacher_name,'المعلم')||' • توجد دعوة جديدة للانضمام إلى '||
      coalesce(v_workspace_name,'مساحة المعلم')||'. افتح حساب الأسرة لمراجعة الدعوة.',
    jsonb_build_object(
      'invite_id',new.id,
      'workspace_id',new.workspace_id,
      'invited_email',new.invited_email,
      'expires_at',new.expires_at
    )
  );

  return new;
end;
$$;

drop trigger if exists parent_invite_notification_created on public.enrollment_invites;
create trigger parent_invite_notification_created
after insert on public.enrollment_invites
for each row execute function public.notify_parent_invite_created();

revoke execute on function public.notify_parent_invite_created() from public,anon,authenticated;
