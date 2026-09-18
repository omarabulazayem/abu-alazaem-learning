-- V7 Phase 2: canonical point accounting, global wallet and permanent game unlocks.
-- Additive migration. The legacy reward_ledger remains as a compatibility event source
-- while all new point movement is mirrored into the append-only V7 point_ledger.

create table if not exists public.student_wallets (
  student_id uuid primary key references public.child_profiles(id) on delete cascade,
  wallet_balance bigint not null default 0,
  lifetime_points bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.child_profiles(id) on delete restrict,
  enrollment_id uuid references public.enrollments(id) on delete restrict,
  workspace_id uuid references public.teacher_workspaces(id) on delete restrict,
  transaction_type text not null check (transaction_type in (
    'TASK_APPROVED','TEACHER_BONUS','GAME_PURCHASE','WEEKLY_REWARD',
    'POINT_REVERSAL','ADMIN_ADJUSTMENT','LEGACY_REWARD','LEGACY_BALANCE_IMPORT'
  )),
  wallet_delta bigint not null default 0,
  lifetime_delta bigint not null default 0,
  weekly_delta bigint not null default 0,
  source_type text,
  source_id uuid,
  source_key text,
  idempotency_key text,
  reversal_of_transaction_id uuid references public.point_ledger(id) on delete restrict,
  reason text,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (wallet_delta <> 0 or lifetime_delta <> 0 or weekly_delta <> 0 or transaction_type = 'GAME_PURCHASE')
);

create unique index if not exists point_ledger_idempotency_idx
  on public.point_ledger(student_id,idempotency_key)
  where idempotency_key is not null;
create unique index if not exists point_ledger_single_reversal_idx
  on public.point_ledger(reversal_of_transaction_id)
  where reversal_of_transaction_id is not null;
create index if not exists point_ledger_student_created_idx
  on public.point_ledger(student_id,created_at desc);
create index if not exists point_ledger_workspace_created_idx
  on public.point_ledger(workspace_id,created_at desc)
  where workspace_id is not null;
create index if not exists point_ledger_enrollment_idx
  on public.point_ledger(enrollment_id,created_at desc)
  where enrollment_id is not null;
create index if not exists point_ledger_created_by_idx
  on public.point_ledger(created_by_user_id)
  where created_by_user_id is not null;

create table if not exists public.game_store_items (
  game_id text primary key,
  wallet_price integer not null check (wallet_price >= 0),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_unlocks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.child_profiles(id) on delete cascade,
  game_id text not null,
  unlocked_at timestamptz not null default now(),
  price_paid integer not null default 0 check (price_paid >= 0),
  ledger_transaction_id uuid references public.point_ledger(id) on delete restrict,
  unique(student_id,game_id)
);
create index if not exists game_unlocks_ledger_idx
  on public.game_unlocks(ledger_transaction_id)
  where ledger_transaction_id is not null;

create or replace function public.ensure_student_wallet()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.student_wallets(student_id)
  values(new.id)
  on conflict(student_id) do nothing;
  return new;
end;
$$;

drop trigger if exists child_profiles_ensure_wallet on public.child_profiles;
create trigger child_profiles_ensure_wallet
after insert on public.child_profiles
for each row execute function public.ensure_student_wallet();

create or replace function public.prevent_point_ledger_mutation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  raise exception 'point_ledger_is_append_only' using errcode='55000';
end;
$$;

drop trigger if exists point_ledger_no_update on public.point_ledger;
create trigger point_ledger_no_update
before update or delete on public.point_ledger
for each row execute function public.prevent_point_ledger_mutation();

create or replace function public.apply_point_ledger()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_wallet bigint;
  v_lifetime bigint;
begin
  insert into public.student_wallets(student_id,wallet_balance,lifetime_points)
  values(new.student_id,0,0)
  on conflict(student_id) do nothing;

  select wallet_balance,lifetime_points
    into v_wallet,v_lifetime
    from public.student_wallets
   where student_id=new.student_id
   for update;

  v_wallet := coalesce(v_wallet,0) + new.wallet_delta;
  v_lifetime := coalesce(v_lifetime,0) + new.lifetime_delta;

  if new.transaction_type='GAME_PURCHASE' and v_wallet < 0 then
    raise exception 'insufficient_wallet_balance' using errcode='22003';
  end if;
  if v_lifetime < 0 then
    raise exception 'lifetime_points_cannot_be_negative' using errcode='22003';
  end if;

  update public.student_wallets
     set wallet_balance=v_wallet,
         lifetime_points=v_lifetime,
         updated_at=now()
   where student_id=new.student_id;

  -- Temporary compatibility mirror for legacy UI. V7 reads student_wallets directly.
  update public.child_profiles
     set points=v_wallet,
         updated_at=now()
   where id=new.student_id;

  return new;
end;
$$;

drop trigger if exists point_ledger_apply on public.point_ledger;
create trigger point_ledger_apply
after insert on public.point_ledger
for each row execute function public.apply_point_ledger();

-- Preserve the existing streak/star/achievement behavior, but move point accounting
-- into V7 point_ledger so there is one canonical accounting stream.
create or replace function public.apply_reward_ledger()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_today date := (new.created_at at time zone 'utc')::date;
  v_previous date;
  v_streak integer;
  v_lifetime bigint;
begin
  select max((created_at at time zone 'utc')::date)
    into v_previous
    from public.reward_ledger
   where child_id=new.child_id
     and id<>new.id
     and (created_at at time zone 'utc')::date<=v_today;

  select streak into v_streak
    from public.child_profiles
   where id=new.child_id
   for update;

  if v_previous=v_today then
    v_streak:=coalesce(v_streak,0);
  elsif v_previous=v_today-1 then
    v_streak:=coalesce(v_streak,0)+1;
  else
    v_streak:=1;
  end if;

  insert into public.point_ledger(
    student_id,transaction_type,wallet_delta,lifetime_delta,weekly_delta,
    source_type,source_id,source_key,idempotency_key,created_by_user_id,metadata,created_at
  ) values(
    new.child_id,'LEGACY_REWARD',new.points,new.points,0,
    'reward_ledger',new.id,new.source_key,'legacy-reward:'||new.id::text,auth.uid(),
    jsonb_build_object('legacy_source_type',new.source_type,'stars',new.stars),
    new.created_at
  )
  on conflict(student_id,idempotency_key) where idempotency_key is not null do nothing;

  update public.child_profiles
     set stars=stars+new.stars,
         streak=v_streak,
         updated_at=now()
   where id=new.child_id;

  select lifetime_points into v_lifetime
  from public.student_wallets where student_id=new.child_id;

  insert into public.achievements(child_id,slug)
  values(new.child_id,'first_steps')
  on conflict(child_id,slug) do nothing;

  case new.source_type
    when 'memorize_session' then
      insert into public.achievements(child_id,slug) values(new.child_id,'first_memorization') on conflict(child_id,slug) do nothing;
    when 'review_session' then
      insert into public.achievements(child_id,slug) values(new.child_id,'first_review') on conflict(child_id,slug) do nothing;
    when 'memory_game' then
      insert into public.achievements(child_id,slug) values(new.child_id,'memory_player') on conflict(child_id,slug) do nothing;
    when 'surah_order_game' then
      insert into public.achievements(child_id,slug) values(new.child_id,'surah_order_master') on conflict(child_id,slug) do nothing;
    when 'surah_quiz_game' then
      insert into public.achievements(child_id,slug) values(new.child_id,'surah_quiz_star') on conflict(child_id,slug) do nothing;
    when 'game_session' then
      insert into public.achievements(child_id,slug) values(new.child_id,'game_engine_player') on conflict(child_id,slug) do nothing;
    else null;
  end case;

  if coalesce(v_lifetime,0)>=100 then
    insert into public.achievements(child_id,slug) values(new.child_id,'hundred_points') on conflict(child_id,slug) do nothing;
  end if;
  if coalesce(v_lifetime,0)>=500 then
    insert into public.achievements(child_id,slug) values(new.child_id,'five_hundred_points') on conflict(child_id,slug) do nothing;
  end if;
  if v_streak>=3 then
    insert into public.achievements(child_id,slug) values(new.child_id,'three_day_streak') on conflict(child_id,slug) do nothing;
  end if;
  if v_streak>=7 then
    insert into public.achievements(child_id,slug) values(new.child_id,'seven_day_streak') on conflict(child_id,slug) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.purchase_game_unlock(p_child_id uuid,p_game_id text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_item public.game_store_items;
  v_tx public.point_ledger;
  v_existing public.game_unlocks;
begin
  if auth.uid() is null or not public.is_child_owner(p_child_id) then
    raise exception 'child_not_owned' using errcode='42501';
  end if;

  select * into v_existing
  from public.game_unlocks
  where student_id=p_child_id and game_id=trim(coalesce(p_game_id,''));

  if v_existing.id is not null then
    return jsonb_build_object('unlocked',true,'already_owned',true,'price_paid',v_existing.price_paid);
  end if;

  select * into v_item
  from public.game_store_items
  where game_id=trim(coalesce(p_game_id,'')) and active=true
  for share;

  if v_item.game_id is null then
    raise exception 'game_not_for_sale';
  end if;

  insert into public.point_ledger(
    student_id,transaction_type,wallet_delta,lifetime_delta,weekly_delta,
    source_type,source_key,idempotency_key,created_by_user_id,metadata
  ) values(
    p_child_id,'GAME_PURCHASE',-v_item.wallet_price,0,0,
    'game_store',v_item.game_id,'game-purchase:'||v_item.game_id,auth.uid(),
    jsonb_build_object('game_id',v_item.game_id,'price',v_item.wallet_price)
  )
  returning * into v_tx;

  insert into public.game_unlocks(student_id,game_id,price_paid,ledger_transaction_id)
  values(p_child_id,v_item.game_id,v_item.wallet_price,v_tx.id)
  returning * into v_existing;

  return jsonb_build_object(
    'unlocked',true,'already_owned',false,'game_id',v_existing.game_id,
    'price_paid',v_existing.price_paid,'ledger_transaction_id',v_tx.id
  );
end;
$$;

create or replace function public.reverse_point_transaction(p_transaction_id uuid,p_reason text)
returns public.point_ledger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_original public.point_ledger;
  v_reversal public.point_ledger;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if length(trim(coalesce(p_reason,'')))<3 then
    raise exception 'reversal_reason_required';
  end if;

  select * into v_original
  from public.point_ledger
  where id=p_transaction_id
  for share;

  if v_original.id is null then raise exception 'transaction_not_found'; end if;
  if v_original.transaction_type in ('GAME_PURCHASE','POINT_REVERSAL') then
    raise exception 'transaction_not_reversible';
  end if;
  if exists(select 1 from public.point_ledger where reversal_of_transaction_id=v_original.id) then
    raise exception 'transaction_already_reversed';
  end if;

  if public.is_platform_admin() then
    null;
  elsif v_original.workspace_id is not null and public.owns_teacher_workspace(v_original.workspace_id) then
    null;
  else
    raise exception 'reversal_not_allowed' using errcode='42501';
  end if;

  insert into public.point_ledger(
    student_id,enrollment_id,workspace_id,transaction_type,
    wallet_delta,lifetime_delta,weekly_delta,source_type,source_id,source_key,
    idempotency_key,reversal_of_transaction_id,reason,created_by_user_id,metadata
  ) values(
    v_original.student_id,v_original.enrollment_id,v_original.workspace_id,'POINT_REVERSAL',
    -v_original.wallet_delta,-v_original.lifetime_delta,-v_original.weekly_delta,
    'point_ledger',v_original.id,v_original.source_key,
    'reversal:'||v_original.id::text,v_original.id,trim(p_reason),auth.uid(),
    jsonb_build_object('original_type',v_original.transaction_type)
  )
  returning * into v_reversal;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,reason,after_state)
  values(auth.uid(),'POINT_REVERSAL','point_ledger',v_reversal.id,trim(p_reason),to_jsonb(v_reversal));

  return v_reversal;
end;
$$;

-- Backfill wallets and preserve pre-V7 balances exactly.
create temporary table if not exists v7_legacy_child_balances on commit drop as
select id as student_id,points::bigint as legacy_points
from public.child_profiles;

insert into public.student_wallets(student_id,wallet_balance,lifetime_points)
select id,0,0 from public.child_profiles
on conflict(student_id) do nothing;

insert into public.point_ledger(
  student_id,transaction_type,wallet_delta,lifetime_delta,weekly_delta,
  source_type,source_id,source_key,idempotency_key,metadata,created_at
)
select
  r.child_id,'LEGACY_REWARD',r.points,r.points,0,
  'reward_ledger',r.id,r.source_key,'legacy-reward:'||r.id::text,
  jsonb_build_object('legacy_source_type',r.source_type,'stars',r.stars,'backfill',true),
  r.created_at
from public.reward_ledger r
on conflict(student_id,idempotency_key) where idempotency_key is not null do nothing;

insert into public.point_ledger(
  student_id,transaction_type,wallet_delta,lifetime_delta,weekly_delta,
  source_type,source_key,idempotency_key,metadata
)
select
  b.student_id,'LEGACY_BALANCE_IMPORT',
  b.legacy_points-w.wallet_balance,
  b.legacy_points-w.lifetime_points,
  0,'legacy_child_profile','initial-balance',
  'legacy-balance-import',
  jsonb_build_object('legacy_points',b.legacy_points,'wallet_after_reward_backfill',w.wallet_balance)
from v7_legacy_child_balances b
join public.student_wallets w on w.student_id=b.student_id
where b.legacy_points<>w.wallet_balance
on conflict(student_id,idempotency_key) where idempotency_key is not null do nothing;

drop trigger if exists student_wallets_set_updated_at on public.student_wallets;
create trigger student_wallets_set_updated_at
before update on public.student_wallets
for each row execute function public.set_updated_at();

drop trigger if exists game_store_items_set_updated_at on public.game_store_items;
create trigger game_store_items_set_updated_at
before update on public.game_store_items
for each row execute function public.set_updated_at();

revoke all on public.student_wallets from anon,authenticated;
revoke all on public.point_ledger from anon,authenticated;
revoke all on public.game_store_items from anon,authenticated;
revoke all on public.game_unlocks from anon,authenticated;

grant select on public.student_wallets to authenticated;
grant select on public.point_ledger to authenticated;
grant select on public.game_store_items to authenticated;
grant select on public.game_unlocks to authenticated;
grant insert,update on public.game_store_items to authenticated;

revoke execute on function public.ensure_student_wallet() from public,anon,authenticated;
revoke execute on function public.prevent_point_ledger_mutation() from public,anon,authenticated;
revoke execute on function public.apply_point_ledger() from public,anon,authenticated;
revoke execute on function public.purchase_game_unlock(uuid,text) from public,anon;
revoke execute on function public.reverse_point_transaction(uuid,text) from public,anon;
grant execute on function public.purchase_game_unlock(uuid,text) to authenticated;
grant execute on function public.reverse_point_transaction(uuid,text) to authenticated;

alter table public.student_wallets enable row level security;
alter table public.point_ledger enable row level security;
alter table public.game_store_items enable row level security;
alter table public.game_unlocks enable row level security;

drop policy if exists student_wallets_select on public.student_wallets;
create policy student_wallets_select on public.student_wallets for select
using(public.is_child_owner(student_id) or public.is_platform_admin());

drop policy if exists point_ledger_select on public.point_ledger;
create policy point_ledger_select on public.point_ledger for select
using(
  public.is_child_owner(student_id)
  or (workspace_id is not null and public.owns_teacher_workspace(workspace_id))
  or public.is_platform_admin()
);

drop policy if exists game_store_items_select on public.game_store_items;
create policy game_store_items_select on public.game_store_items for select
using(active=true or public.is_platform_admin());

drop policy if exists game_store_items_admin_insert on public.game_store_items;
create policy game_store_items_admin_insert on public.game_store_items for insert
with check(public.is_platform_admin());

drop policy if exists game_store_items_admin_update on public.game_store_items;
create policy game_store_items_admin_update on public.game_store_items for update
using(public.is_platform_admin())
with check(public.is_platform_admin());

drop policy if exists game_unlocks_select on public.game_unlocks;
create policy game_unlocks_select on public.game_unlocks for select
using(public.is_child_owner(student_id) or public.is_platform_admin());
