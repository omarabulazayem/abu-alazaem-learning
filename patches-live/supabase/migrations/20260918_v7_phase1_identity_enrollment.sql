-- V7 Phase 1: identity, teacher workspace, enrollment, invite, child-mode PIN and audit foundation.
-- Additive migration only: legacy classes/class_students remain operational during transition.

create extension if not exists pgcrypto;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_type = 'admin'
  );
$$;

create table if not exists public.teacher_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_teacher_user_id uuid not null unique references public.profiles(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Africa/Cairo',
  status text not null default 'active'
    check (status in ('active','paused','suspended','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_settings (
  workspace_id uuid primary key references public.teacher_workspaces(id) on delete cascade,
  late_cancellation_hours integer not null default 24
    check (late_cancellation_hours between 0 and 168),
  leaderboard_privacy text not null default 'first_name_initial'
    check (leaderboard_privacy in ('first_name_initial','first_name_only','hidden')),
  first_place_reward integer not null default 50 check (first_place_reward >= 0),
  second_place_reward integer not null default 30 check (second_place_reward >= 0),
  third_place_reward integer not null default 20 check (third_place_reward >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parent_student_relations (
  parent_user_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.child_profiles(id) on delete cascade,
  relationship_type text not null default 'parent',
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(parent_user_id, student_id)
);
create unique index if not exists parent_student_single_owner_idx
  on public.parent_student_relations(student_id)
  where is_owner = true;

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.teacher_workspaces(id) on delete cascade,
  teacher_user_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.child_profiles(id) on delete cascade,
  session_rate numeric(12,2) not null default 0 check (session_rate >= 0),
  status text not null default 'active'
    check (status in ('active','paused','ended')),
  joined_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, student_id)
);
create index if not exists enrollments_teacher_idx on public.enrollments(teacher_user_id, status);
create index if not exists enrollments_student_idx on public.enrollments(student_id, status);

create table if not exists public.enrollment_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.teacher_workspaces(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  session_rate numeric(12,2) not null default 0 check (session_rate >= 0),
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','expired','revoked')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists enrollment_invites_workspace_idx
  on public.enrollment_invites(workspace_id, status, created_at desc);
create index if not exists enrollment_invites_email_idx
  on public.enrollment_invites(lower(invited_email), status);

create table if not exists public.family_security (
  parent_user_id uuid primary key references public.profiles(id) on delete cascade,
  child_mode_pin_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_user_id, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

create or replace function public.owns_teacher_workspace(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.teacher_workspaces w
    where w.id = p_workspace_id
      and w.owner_teacher_user_id = auth.uid()
      and w.status <> 'closed'
  );
$$;

create or replace function public.is_child_owner(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.parent_student_relations r
    where r.student_id = p_child_id
      and r.parent_user_id = auth.uid()
      and r.is_owner = true
  )
  or exists(
    select 1 from public.child_profiles c
    where c.id = p_child_id and c.parent_id = auth.uid()
  );
$$;

create or replace function public.teacher_can_access_child(p_child_id uuid, p_workspace_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.enrollments e
    join public.teacher_workspaces w on w.id = e.workspace_id
    where e.student_id = p_child_id
      and e.status in ('active','paused')
      and e.teacher_user_id = auth.uid()
      and w.owner_teacher_user_id = auth.uid()
      and (p_workspace_id is null or e.workspace_id = p_workspace_id)
  );
$$;

create or replace function public.ensure_teacher_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  if new.account_type = 'teacher' then
    insert into public.teacher_workspaces(owner_teacher_user_id, display_name)
    values (new.id, coalesce(nullif(new.display_name,''), 'مساحة المعلم'))
    on conflict(owner_teacher_user_id) do update
      set display_name = excluded.display_name,
          updated_at = now()
    returning id into v_workspace_id;

    insert into public.teacher_settings(workspace_id)
    values(v_workspace_id)
    on conflict(workspace_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_teacher_workspace on public.profiles;
create trigger profiles_ensure_teacher_workspace
after insert or update of account_type, display_name on public.profiles
for each row execute function public.ensure_teacher_workspace();

create or replace function public.ensure_child_owner_relation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.parent_student_relations(parent_user_id, student_id, relationship_type, is_owner)
  values(new.parent_id, new.id, 'parent', true)
  on conflict(parent_user_id, student_id) do update
    set is_owner = true;
  return new;
end;
$$;

drop trigger if exists child_profiles_ensure_owner_relation on public.child_profiles;
create trigger child_profiles_ensure_owner_relation
after insert or update of parent_id on public.child_profiles
for each row execute function public.ensure_child_owner_relation();

-- Backfill workspaces/settings for existing teachers.
insert into public.teacher_workspaces(owner_teacher_user_id, display_name)
select p.id, coalesce(nullif(p.display_name,''), 'مساحة المعلم')
from public.profiles p
where p.account_type = 'teacher'
on conflict(owner_teacher_user_id) do update
set display_name = excluded.display_name,
    updated_at = now();

insert into public.teacher_settings(workspace_id)
select w.id from public.teacher_workspaces w
on conflict(workspace_id) do nothing;

-- Backfill parent ownership relations.
insert into public.parent_student_relations(parent_user_id, student_id, relationship_type, is_owner)
select c.parent_id, c.id, 'parent', true
from public.child_profiles c
on conflict(parent_user_id, student_id) do update
set is_owner = true;

-- Backfill legacy class links into one Enrollment per teacher workspace + child.
insert into public.enrollments(workspace_id, teacher_user_id, student_id, session_rate, status, joined_at, accepted_at)
select w.id, c.teacher_id, cs.child_id, 0, 'active', cs.joined_at, cs.joined_at
from public.class_students cs
join public.classes c on c.id = cs.class_id
join public.teacher_workspaces w on w.owner_teacher_user_id = c.teacher_id
on conflict(workspace_id, student_id) do nothing;

create or replace function public.create_enrollment_invite(
  p_parent_email text,
  p_session_rate numeric default 0,
  p_expires_hours integer default 168
)
returns table(invite_id uuid, invite_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace public.teacher_workspaces;
  v_token text;
  v_invite public.enrollment_invites;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if length(trim(coalesce(p_parent_email,''))) < 5 or position('@' in p_parent_email) = 0 then
    raise exception 'invalid_email';
  end if;
  if coalesce(p_session_rate,0) < 0 then
    raise exception 'invalid_session_rate';
  end if;
  if coalesce(p_expires_hours,168) < 1 or p_expires_hours > 720 then
    raise exception 'invalid_expiry';
  end if;

  select * into v_workspace
  from public.teacher_workspaces
  where owner_teacher_user_id = auth.uid()
    and status = 'active'
  limit 1;

  if v_workspace.id is null then
    raise exception 'teacher_workspace_not_found' using errcode='42501';
  end if;

  v_token := encode(gen_random_bytes(32),'hex');

  insert into public.enrollment_invites(
    workspace_id, invited_email, invited_by, session_rate, token_hash, expires_at
  ) values(
    v_workspace.id,
    lower(trim(p_parent_email)),
    auth.uid(),
    coalesce(p_session_rate,0),
    encode(digest(v_token,'sha256'),'hex'),
    now() + make_interval(hours => coalesce(p_expires_hours,168))
  )
  returning * into v_invite;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, after_state)
  values(
    auth.uid(), 'ENROLLMENT_INVITE_CREATED', 'enrollment_invite', v_invite.id,
    jsonb_build_object('workspace_id',v_invite.workspace_id,'invited_email',v_invite.invited_email,'session_rate',v_invite.session_rate,'expires_at',v_invite.expires_at)
  );

  return query select v_invite.id, v_token, v_invite.expires_at;
end;
$$;

create or replace function public.accept_enrollment_invite(
  p_invite_token text,
  p_child_id uuid
)
returns public.enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.enrollment_invites;
  v_enrollment public.enrollments;
  v_email text;
  v_teacher_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if not public.is_child_owner(p_child_id) then
    raise exception 'child_not_owned' using errcode='42501';
  end if;

  v_email := lower(coalesce(auth.jwt()->>'email',''));

  select * into v_invite
  from public.enrollment_invites
  where token_hash = encode(digest(trim(coalesce(p_invite_token,'')),'sha256'),'hex')
  for update;

  if v_invite.id is null then raise exception 'invite_not_found'; end if;
  if v_invite.status <> 'pending' then raise exception 'invite_not_pending'; end if;
  if v_invite.expires_at <= now() then
    update public.enrollment_invites set status='expired' where id=v_invite.id;
    raise exception 'invite_expired';
  end if;
  if v_email = '' or v_email <> lower(v_invite.invited_email) then
    raise exception 'invite_email_mismatch' using errcode='42501';
  end if;

  select owner_teacher_user_id into v_teacher_id
  from public.teacher_workspaces
  where id = v_invite.workspace_id and status = 'active';

  if v_teacher_id is null then
    raise exception 'teacher_workspace_inactive';
  end if;

  insert into public.enrollments(
    workspace_id, teacher_user_id, student_id, session_rate, status, accepted_at
  ) values(
    v_invite.workspace_id, v_teacher_id, p_child_id, v_invite.session_rate, 'active', now()
  )
  on conflict(workspace_id, student_id) do update
    set teacher_user_id = excluded.teacher_user_id,
        session_rate = excluded.session_rate,
        status = 'active',
        accepted_at = now(),
        ended_at = null,
        updated_at = now()
  returning * into v_enrollment;

  update public.enrollment_invites
  set status='accepted', accepted_at=now(), accepted_by=auth.uid()
  where id=v_invite.id;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, after_state)
  values(
    auth.uid(), 'ENROLLMENT_INVITE_ACCEPTED', 'enrollment', v_enrollment.id,
    to_jsonb(v_enrollment)
  );

  return v_enrollment;
end;
$$;

create or replace function public.set_child_mode_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and account_type in ('parent','admin')) then
    raise exception 'parent_required' using errcode='42501';
  end if;
  if trim(coalesce(p_pin,'')) !~ '^[0-9]{4}$' then
    raise exception 'pin_must_be_four_digits';
  end if;

  insert into public.family_security(parent_user_id, child_mode_pin_hash, updated_at)
  values(auth.uid(), crypt(trim(p_pin), gen_salt('bf',10)), now())
  on conflict(parent_user_id) do update
    set child_mode_pin_hash = excluded.child_mode_pin_hash,
        updated_at = now();

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id)
  values(auth.uid(), 'CHILD_MODE_PIN_CHANGED', 'family_security', auth.uid());

  return true;
end;
$$;

create or replace function public.verify_child_mode_pin(p_pin text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.family_security s
    where s.parent_user_id = auth.uid()
      and s.child_mode_pin_hash = crypt(trim(coalesce(p_pin,'')), s.child_mode_pin_hash)
  );
$$;

-- Generic updated_at triggers where an updated_at column exists.
drop trigger if exists teacher_workspaces_set_updated_at on public.teacher_workspaces;
create trigger teacher_workspaces_set_updated_at
before update on public.teacher_workspaces
for each row execute function public.set_updated_at();

drop trigger if exists teacher_settings_set_updated_at on public.teacher_settings;
create trigger teacher_settings_set_updated_at
before update on public.teacher_settings
for each row execute function public.set_updated_at();

drop trigger if exists enrollments_set_updated_at on public.enrollments;
create trigger enrollments_set_updated_at
before update on public.enrollments
for each row execute function public.set_updated_at();

-- Permissions.
revoke all on public.teacher_workspaces from anon, authenticated;
revoke all on public.teacher_settings from anon, authenticated;
revoke all on public.parent_student_relations from anon, authenticated;
revoke all on public.enrollments from anon, authenticated;
revoke all on public.enrollment_invites from anon, authenticated;
revoke all on public.family_security from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;

grant select on public.teacher_workspaces to authenticated;
grant update(display_name, timezone) on public.teacher_workspaces to authenticated;
grant select, update(late_cancellation_hours,leaderboard_privacy,first_place_reward,second_place_reward,third_place_reward)
  on public.teacher_settings to authenticated;
grant select on public.parent_student_relations to authenticated;
grant select on public.enrollments to authenticated;
grant select on public.enrollment_invites to authenticated;
grant select on public.audit_logs to authenticated;

revoke execute on function public.is_platform_admin() from public, anon;
revoke execute on function public.owns_teacher_workspace(uuid) from public, anon;
revoke execute on function public.is_child_owner(uuid) from public, anon;
revoke execute on function public.teacher_can_access_child(uuid,uuid) from public, anon;
revoke execute on function public.create_enrollment_invite(text,numeric,integer) from public, anon;
revoke execute on function public.accept_enrollment_invite(text,uuid) from public, anon;
revoke execute on function public.set_child_mode_pin(text) from public, anon;
revoke execute on function public.verify_child_mode_pin(text) from public, anon;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.owns_teacher_workspace(uuid) to authenticated;
grant execute on function public.is_child_owner(uuid) to authenticated;
grant execute on function public.teacher_can_access_child(uuid,uuid) to authenticated;
grant execute on function public.create_enrollment_invite(text,numeric,integer) to authenticated;
grant execute on function public.accept_enrollment_invite(text,uuid) to authenticated;
grant execute on function public.set_child_mode_pin(text) to authenticated;
grant execute on function public.verify_child_mode_pin(text) to authenticated;

alter table public.teacher_workspaces enable row level security;
alter table public.teacher_settings enable row level security;
alter table public.parent_student_relations enable row level security;
alter table public.enrollments enable row level security;
alter table public.enrollment_invites enable row level security;
alter table public.family_security enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists teacher_workspaces_select on public.teacher_workspaces;
create policy teacher_workspaces_select on public.teacher_workspaces for select
using (owner_teacher_user_id = auth.uid() or public.is_platform_admin());

drop policy if exists teacher_workspaces_update on public.teacher_workspaces;
create policy teacher_workspaces_update on public.teacher_workspaces for update
using (owner_teacher_user_id = auth.uid() or public.is_platform_admin())
with check (owner_teacher_user_id = auth.uid() or public.is_platform_admin());

drop policy if exists teacher_settings_select on public.teacher_settings;
create policy teacher_settings_select on public.teacher_settings for select
using (public.owns_teacher_workspace(workspace_id) or public.is_platform_admin());

drop policy if exists teacher_settings_update on public.teacher_settings;
create policy teacher_settings_update on public.teacher_settings for update
using (public.owns_teacher_workspace(workspace_id) or public.is_platform_admin())
with check (public.owns_teacher_workspace(workspace_id) or public.is_platform_admin());

drop policy if exists parent_student_relations_select on public.parent_student_relations;
create policy parent_student_relations_select on public.parent_student_relations for select
using (
  parent_user_id = auth.uid()
  or public.teacher_can_access_child(student_id, null)
  or public.is_platform_admin()
);

drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments for select
using (
  teacher_user_id = auth.uid()
  or public.is_child_owner(student_id)
  or public.is_platform_admin()
);

drop policy if exists enrollment_invites_select on public.enrollment_invites;
create policy enrollment_invites_select on public.enrollment_invites for select
using (
  invited_by = auth.uid()
  or lower(invited_email) = lower(coalesce(auth.jwt()->>'email',''))
  or public.is_platform_admin()
);

-- family_security intentionally has no direct SELECT policy; use PIN RPCs.

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs for select
using (actor_user_id = auth.uid() or public.is_platform_admin());

-- Future teacher/student access should use Enrollment. Keep legacy class RLS unchanged
-- until the UI and API migration is complete.
