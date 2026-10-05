-- V7: teacher SaaS subscription foundation.
-- Provider-neutral contracts; no external payment gateway is assumed or wired here.

create table if not exists public.saas_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  name_ar text not null check (char_length(trim(name_ar)) between 2 and 120),
  description_ar text,
  currency text not null default 'EGP' check (currency ~ '^[A-Z]{3}$'),
  monthly_price numeric(12,2) not null default 0 check (monthly_price >= 0),
  yearly_price numeric(12,2) check (yearly_price is null or yearly_price >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  features jsonb not null default '{}'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists saas_plans_active_idx on public.saas_plans(active,sort_order,created_at);

create table if not exists public.teacher_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.teacher_workspaces(id) on delete cascade,
  plan_id uuid references public.saas_plans(id) on delete set null,
  status text not null default 'PENDING_PLAN'
    check (status in ('PENDING_PLAN','INCOMPLETE','TRIALING','ACTIVE','PAST_DUE','CANCELLED','SUSPENDED','EXPIRED','MANUAL')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  grace_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_end is null or current_period_start is null or current_period_end >= current_period_start)
);
create index if not exists teacher_subscriptions_status_idx on public.teacher_subscriptions(status,current_period_end);
create unique index if not exists teacher_subscriptions_provider_subscription_idx
  on public.teacher_subscriptions(provider,provider_subscription_id)
  where provider is not null and provider_subscription_id is not null;

create table if not exists public.teacher_subscription_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.teacher_workspaces(id) on delete set null,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  status text,
  provider_customer_id text,
  provider_subscription_id text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  applied_at timestamptz
);
create unique index if not exists teacher_subscription_events_provider_id_idx
  on public.teacher_subscription_events(provider,provider_event_id);
create index if not exists teacher_subscription_events_workspace_idx
  on public.teacher_subscription_events(workspace_id,received_at desc);

drop trigger if exists saas_plans_set_updated_at on public.saas_plans;
create trigger saas_plans_set_updated_at
before update on public.saas_plans
for each row execute function public.set_updated_at();

drop trigger if exists teacher_subscriptions_set_updated_at on public.teacher_subscriptions;
create trigger teacher_subscriptions_set_updated_at
before update on public.teacher_subscriptions
for each row execute function public.set_updated_at();

create or replace function public.ensure_teacher_subscription()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.teacher_subscriptions(workspace_id,status)
  values(new.id,'PENDING_PLAN')
  on conflict(workspace_id) do nothing;
  return new;
end;
$$;

drop trigger if exists teacher_workspace_ensure_subscription on public.teacher_workspaces;
create trigger teacher_workspace_ensure_subscription
after insert on public.teacher_workspaces
for each row execute function public.ensure_teacher_subscription();

insert into public.teacher_subscriptions(workspace_id,status)
select id,'PENDING_PLAN'
from public.teacher_workspaces
on conflict(workspace_id) do nothing;

create or replace function public.upsert_saas_plan(
  p_plan_id uuid default null,
  p_code text default null,
  p_name_ar text default null,
  p_description_ar text default null,
  p_currency text default 'EGP',
  p_monthly_price numeric default 0,
  p_yearly_price numeric default null,
  p_active boolean default true,
  p_sort_order integer default 0,
  p_features jsonb default '{}'::jsonb,
  p_limits jsonb default '{}'::jsonb
)
returns public.saas_plans
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row public.saas_plans;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'admin_required' using errcode='42501';
  end if;
  if char_length(trim(coalesce(p_code,'')))<2 or p_code !~ '^[a-z0-9][a-z0-9_-]{1,63}$' then
    raise exception 'invalid_plan_code';
  end if;
  if char_length(trim(coalesce(p_name_ar,'')))<2 then
    raise exception 'invalid_plan_name';
  end if;
  if p_monthly_price is null or p_monthly_price<0 or (p_yearly_price is not null and p_yearly_price<0) then
    raise exception 'invalid_plan_price';
  end if;
  if upper(coalesce(p_currency,'EGP')) !~ '^[A-Z]{3}$' then
    raise exception 'invalid_currency';
  end if;

  if p_plan_id is null then
    insert into public.saas_plans(
      code,name_ar,description_ar,currency,monthly_price,yearly_price,active,sort_order,features,limits
    ) values(
      lower(trim(p_code)),trim(p_name_ar),nullif(trim(p_description_ar),''),upper(coalesce(p_currency,'EGP')),
      p_monthly_price,p_yearly_price,coalesce(p_active,true),coalesce(p_sort_order,0),
      coalesce(p_features,'{}'::jsonb),coalesce(p_limits,'{}'::jsonb)
    )
    returning * into v_row;
  else
    update public.saas_plans
    set code=lower(trim(p_code)),
        name_ar=trim(p_name_ar),
        description_ar=nullif(trim(p_description_ar),''),
        currency=upper(coalesce(p_currency,'EGP')),
        monthly_price=p_monthly_price,
        yearly_price=p_yearly_price,
        active=coalesce(p_active,true),
        sort_order=coalesce(p_sort_order,0),
        features=coalesce(p_features,'{}'::jsonb),
        limits=coalesce(p_limits,'{}'::jsonb)
    where id=p_plan_id
    returning * into v_row;
    if v_row.id is null then raise exception 'plan_not_found'; end if;
  end if;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_state)
  values(auth.uid(),case when p_plan_id is null then 'SAAS_PLAN_CREATED' else 'SAAS_PLAN_UPDATED' end,'saas_plan',v_row.id,to_jsonb(v_row));
  return v_row;
end;
$$;

create or replace function public.apply_teacher_subscription_event(
  p_workspace_id uuid,
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_status text,
  p_plan_id uuid default null,
  p_provider_customer_id text default null,
  p_provider_subscription_id text default null,
  p_current_period_start timestamptz default null,
  p_current_period_end timestamptz default null,
  p_cancel_at_period_end boolean default false,
  p_grace_until timestamptz default null,
  p_payload jsonb default '{}'::jsonb
)
returns public.teacher_subscriptions
language plpgsql
security definer
set search_path=public
as $$
declare
  v_sub public.teacher_subscriptions;
  v_event public.teacher_subscription_events;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'service_role_required' using errcode='42501';
  end if;
  if p_workspace_id is null or not exists(select 1 from public.teacher_workspaces where id=p_workspace_id) then
    raise exception 'workspace_not_found';
  end if;
  if char_length(trim(coalesce(p_provider,'')))<2 or char_length(trim(coalesce(p_provider_event_id,'')))<2 then
    raise exception 'provider_event_identity_required';
  end if;
  if char_length(trim(coalesce(p_event_type,'')))<2 then raise exception 'event_type_required'; end if;
  if p_status is not null and p_status not in ('PENDING_PLAN','INCOMPLETE','TRIALING','ACTIVE','PAST_DUE','CANCELLED','SUSPENDED','EXPIRED','MANUAL') then
    raise exception 'invalid_subscription_status';
  end if;
  if p_plan_id is not null and not exists(select 1 from public.saas_plans where id=p_plan_id) then
    raise exception 'plan_not_found';
  end if;

  insert into public.teacher_subscription_events(
    workspace_id,provider,provider_event_id,event_type,status,provider_customer_id,provider_subscription_id,payload
  ) values(
    p_workspace_id,trim(p_provider),trim(p_provider_event_id),trim(p_event_type),p_status,
    nullif(trim(p_provider_customer_id),''),nullif(trim(p_provider_subscription_id),''),coalesce(p_payload,'{}'::jsonb)
  )
  on conflict(provider,provider_event_id) do nothing
  returning * into v_event;

  if v_event.id is null then
    select * into v_sub from public.teacher_subscriptions where workspace_id=p_workspace_id;
    return v_sub;
  end if;

  insert into public.teacher_subscriptions(
    workspace_id,plan_id,status,provider,provider_customer_id,provider_subscription_id,
    current_period_start,current_period_end,cancel_at_period_end,grace_until,metadata
  ) values(
    p_workspace_id,p_plan_id,coalesce(p_status,'INCOMPLETE'),trim(p_provider),
    nullif(trim(p_provider_customer_id),''),nullif(trim(p_provider_subscription_id),''),
    p_current_period_start,p_current_period_end,coalesce(p_cancel_at_period_end,false),p_grace_until,coalesce(p_payload,'{}'::jsonb)
  )
  on conflict(workspace_id) do update
    set plan_id=coalesce(excluded.plan_id,public.teacher_subscriptions.plan_id),
        status=coalesce(excluded.status,public.teacher_subscriptions.status),
        provider=coalesce(excluded.provider,public.teacher_subscriptions.provider),
        provider_customer_id=coalesce(excluded.provider_customer_id,public.teacher_subscriptions.provider_customer_id),
        provider_subscription_id=coalesce(excluded.provider_subscription_id,public.teacher_subscriptions.provider_subscription_id),
        current_period_start=coalesce(excluded.current_period_start,public.teacher_subscriptions.current_period_start),
        current_period_end=coalesce(excluded.current_period_end,public.teacher_subscriptions.current_period_end),
        cancel_at_period_end=excluded.cancel_at_period_end,
        grace_until=excluded.grace_until,
        metadata=coalesce(excluded.metadata,public.teacher_subscriptions.metadata),
        updated_at=now()
  returning * into v_sub;

  update public.teacher_subscription_events
  set applied_at=now()
  where id=v_event.id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_state,metadata)
  values(null,'TEACHER_SUBSCRIPTION_EVENT_APPLIED','teacher_subscription',v_sub.id,to_jsonb(v_sub),
    jsonb_build_object('provider',p_provider,'provider_event_id',p_provider_event_id,'event_type',p_event_type));
  return v_sub;
end;
$$;


create or replace function public.select_teacher_subscription_plan(
  p_workspace_id uuid,
  p_plan_id uuid
)
returns public.teacher_subscriptions
language plpgsql
security definer
set search_path=public
as $
declare
  v_sub public.teacher_subscriptions;
  v_plan public.saas_plans;
  v_before jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if not public.owns_teacher_workspace(p_workspace_id) then
    raise exception 'teacher_not_allowed' using errcode='42501';
  end if;

  select * into v_plan
  from public.saas_plans
  where id=p_plan_id and active=true;
  if v_plan.id is null then raise exception 'plan_not_found_or_inactive'; end if;

  select * into v_sub
  from public.teacher_subscriptions
  where workspace_id=p_workspace_id
  for update;

  if v_sub.id is null then
    insert into public.teacher_subscriptions(workspace_id,plan_id,status)
    values(p_workspace_id,p_plan_id,'PENDING_PLAN')
    returning * into v_sub;
    v_before:='null'::jsonb;
  else
    if v_sub.status not in ('PENDING_PLAN','INCOMPLETE','CANCELLED','EXPIRED','SUSPENDED') then
      raise exception 'plan_change_requires_payment_flow';
    end if;
    v_before:=to_jsonb(v_sub);
    update public.teacher_subscriptions
    set plan_id=p_plan_id,
        status=case when status in ('ACTIVE','TRIALING','MANUAL') then status else 'PENDING_PLAN' end,
        updated_at=now()
    where workspace_id=p_workspace_id
    returning * into v_sub;
  end if;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_state,after_state,reason)
  values(auth.uid(),'TEACHER_SUBSCRIPTION_PLAN_SELECTED','teacher_subscription',v_sub.id,v_before,to_jsonb(v_sub),'Teacher selected SaaS plan');

  return v_sub;
end;
$;

create or replace function public.set_teacher_subscription_manual(
  p_workspace_id uuid,
  p_plan_id uuid,
  p_current_period_end timestamptz default null,
  p_reason text
)
returns public.teacher_subscriptions
language plpgsql
security definer
set search_path=public
as $
declare
  v_sub public.teacher_subscriptions;
  v_plan public.saas_plans;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'admin_required' using errcode='42501';
  end if;
  if char_length(trim(coalesce(p_reason,'')))<3 then
    raise exception 'manual_activation_reason_required';
  end if;
  if not exists(select 1 from public.teacher_workspaces where id=p_workspace_id) then
    raise exception 'workspace_not_found';
  end if;
  select * into v_plan from public.saas_plans where id=p_plan_id;
  if v_plan.id is null then raise exception 'plan_not_found'; end if;

  insert into public.teacher_subscriptions(
    workspace_id,plan_id,status,provider,current_period_start,current_period_end,
    cancel_at_period_end,grace_until,metadata
  ) values(
    p_workspace_id,p_plan_id,'MANUAL','manual',now(),p_current_period_end,
    false,null,jsonb_build_object('manual_reason',trim(p_reason))
  )
  on conflict(workspace_id) do update
    set plan_id=excluded.plan_id,
        status='MANUAL',
        provider='manual',
        current_period_start=now(),
        current_period_end=excluded.current_period_end,
        cancel_at_period_end=false,
        grace_until=null,
        metadata=excluded.metadata,
        updated_at=now()
  returning * into v_sub;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_state,reason)
  values(auth.uid(),'TEACHER_SUBSCRIPTION_MANUAL_ACTIVATED','teacher_subscription',v_sub.id,to_jsonb(v_sub),trim(p_reason));

  return v_sub;
end;
$;

revoke all on public.saas_plans from anon,authenticated;
revoke all on public.teacher_subscriptions from anon,authenticated;
revoke all on public.teacher_subscription_events from anon,authenticated;

grant select on public.saas_plans to authenticated;
grant select on public.teacher_subscriptions to authenticated;

alter table public.saas_plans enable row level security;
alter table public.teacher_subscriptions enable row level security;
alter table public.teacher_subscription_events enable row level security;

drop policy if exists saas_plans_select on public.saas_plans;
create policy saas_plans_select on public.saas_plans
for select to authenticated
using (active=true or public.is_platform_admin());

drop policy if exists saas_plans_admin_insert on public.saas_plans;
create policy saas_plans_admin_insert on public.saas_plans
for insert to authenticated
with check (public.is_platform_admin());

drop policy if exists saas_plans_admin_update on public.saas_plans;
create policy saas_plans_admin_update on public.saas_plans
for update to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists teacher_subscriptions_select on public.teacher_subscriptions;
create policy teacher_subscriptions_select on public.teacher_subscriptions
for select to authenticated
using (
  public.owns_teacher_workspace(workspace_id)
  or public.is_platform_admin()
);

drop policy if exists teacher_subscription_events_deny on public.teacher_subscription_events;
create policy teacher_subscription_events_deny on public.teacher_subscription_events
for all to authenticated
using (false)
with check (false);

revoke execute on function public.ensure_teacher_subscription() from public,anon,authenticated;
revoke execute on function public.upsert_saas_plan(uuid,text,text,text,text,numeric,numeric,boolean,integer,jsonb,jsonb) from public,anon;
revoke execute on function public.select_teacher_subscription_plan(uuid,uuid) from public,anon;
revoke execute on function public.set_teacher_subscription_manual(uuid,uuid,timestamptz,text) from public,anon;
revoke execute on function public.apply_teacher_subscription_event(uuid,text,text,text,text,uuid,text,text,timestamptz,timestamptz,boolean,timestamptz,jsonb) from public,anon,authenticated;

grant execute on function public.upsert_saas_plan(uuid,text,text,text,text,numeric,numeric,boolean,integer,jsonb,jsonb) to authenticated;
grant execute on function public.select_teacher_subscription_plan(uuid,uuid) to authenticated;
grant execute on function public.set_teacher_subscription_manual(uuid,uuid,timestamptz,text) to authenticated;
grant execute on function public.apply_teacher_subscription_event(uuid,text,text,text,text,uuid,text,text,timestamptz,timestamptz,boolean,timestamptz,jsonb) to service_role;
