-- V7 Phase 6 invite-token retention hardening.
-- Parent invite email links require the plaintext token temporarily in the delivery payload.
-- Redact it immediately after acceptance/revocation/expiry.

create or replace function public.redact_invite_notification_token(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.notifications
  set action_path=null,
      metadata=metadata||jsonb_build_object('invite_link_redacted_at',now())
  where event_type='parent_invite'
    and entity_type='enrollment_invite'
    and entity_id=p_invite_id;

  update public.notification_deliveries d
  set payload=d.payload-'action_path'
  from public.notifications n
  where d.notification_id=n.id
    and n.event_type='parent_invite'
    and n.entity_type='enrollment_invite'
    and n.entity_id=p_invite_id;
end;
$$;

create or replace function public.redact_invite_notification_on_status()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status<>old.status and new.status<>'pending' then
    perform public.redact_invite_notification_token(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists enrollment_invites_redact_notification_token on public.enrollment_invites;
create trigger enrollment_invites_redact_notification_token
after update of status on public.enrollment_invites
for each row execute function public.redact_invite_notification_on_status();

create or replace function public.redact_expired_invite_notification_tokens()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_invite record;
  v_count integer:=0;
begin
  for v_invite in
    select id
    from public.enrollment_invites
    where expires_at<=now()
      and status='pending'
  loop
    update public.enrollment_invites
    set status='expired'
    where id=v_invite.id;

    -- Status trigger performs the actual token redaction.
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.redact_invite_notification_token(uuid) from public,anon,authenticated;
revoke execute on function public.redact_invite_notification_on_status() from public,anon,authenticated;
revoke execute on function public.redact_expired_invite_notification_tokens() from public,anon,authenticated;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname='v7-invite-token-redaction'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'v7-invite-token-redaction',
    '17 * * * *',
    'select public.redact_expired_invite_notification_tokens();'
  );
end;
$$;
