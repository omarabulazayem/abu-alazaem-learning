-- V7: teacher manual bonus points.
-- Uses the existing append-only point_ledger so wallet, lifetime points,
-- weekly score, and audit history remain in one accounting stream.

create or replace function public.grant_teacher_bonus(
  p_enrollment_id uuid,
  p_points bigint,
  p_reason text
)
returns public.point_ledger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_enrollment public.enrollments;
  v_tx public.point_ledger;
  v_reason text:=nullif(trim(coalesce(p_reason,'')),'');
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if coalesce(p_points,0)<=0 or p_points>100000 then
    raise exception 'invalid_bonus_points';
  end if;

  if v_reason is null or char_length(v_reason)<3 then
    raise exception 'bonus_reason_required';
  end if;

  select * into v_enrollment
  from public.enrollments
  where id=p_enrollment_id
  for share;

  if v_enrollment.id is null
     or v_enrollment.teacher_user_id<>auth.uid()
     or v_enrollment.status not in ('active','paused')
     or not public.owns_teacher_workspace(v_enrollment.workspace_id) then
    raise exception 'teacher_not_allowed' using errcode='42501';
  end if;

  insert into public.point_ledger(
    student_id,enrollment_id,workspace_id,transaction_type,
    wallet_delta,lifetime_delta,weekly_delta,
    source_type,source_id,source_key,idempotency_key,
    reason,created_by_user_id,metadata
  ) values(
    v_enrollment.student_id,v_enrollment.id,v_enrollment.workspace_id,'TEACHER_BONUS',
    p_points,p_points,p_points,
    'teacher_bonus',v_enrollment.id,
    'teacher-bonus:'||gen_random_uuid()::text,null,
    v_reason,auth.uid(),
    jsonb_build_object('enrollment_id',v_enrollment.id,'points',p_points)
  )
  returning * into v_tx;

  insert into public.audit_logs(
    actor_user_id,action,entity_type,entity_id,reason,after_state
  ) values(
    auth.uid(),'TEACHER_BONUS','point_ledger',v_tx.id,v_reason,to_jsonb(v_tx)
  );

  return v_tx;
end;
$$;

revoke all on function public.grant_teacher_bonus(uuid,bigint,text) from public,anon;
grant execute on function public.grant_teacher_bonus(uuid,bigint,text) to authenticated;
