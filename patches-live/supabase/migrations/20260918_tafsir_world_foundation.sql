-- Abu Al-Azaem Tafsir / Quran Understanding foundation.
-- No tafsir rows are seeded here. Child-facing content must be source-backed and approved.

create table if not exists public.tafsir_content (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  surah_number integer not null check (surah_number between 1 and 114),
  ayah_start integer not null check (ayah_start > 0),
  ayah_end integer not null check (ayah_end >= ayah_start),
  source_name text not null default '',
  source_author text not null default '',
  source_reference text not null default '',
  source_url text,
  source_text text not null default '',
  child_friendly_explanation text not null default '',
  guidance_summary text,
  age_min integer not null default 4 check (age_min between 3 and 12),
  age_max integer not null default 12 check (age_max between age_min and 12),
  tags text[] not null default '{}',
  approval_status text not null default 'draft' check (approval_status in ('draft','in_review','approved','rejected')),
  created_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tafsir_content_approved_requires_source check (
    approval_status <> 'approved' or (
      length(trim(source_name)) > 0 and
      length(trim(source_reference)) > 0 and
      length(trim(source_text)) > 0 and
      length(trim(child_friendly_explanation)) > 0 and
      reviewed_by is not null and reviewed_at is not null
    )
  )
);
create index if not exists tafsir_content_ayah_idx on public.tafsir_content(surah_number, ayah_start, ayah_end);
create index if not exists tafsir_content_approved_idx on public.tafsir_content(approval_status, surah_number);

create table if not exists public.tafsir_questions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.tafsir_content(id) on delete cascade,
  game_id text not null,
  question_type text not null,
  difficulty text not null default 'easy' check (difficulty in ('easy','medium','hard','advanced')),
  age_min integer not null default 4 check (age_min between 3 and 12),
  age_max integer not null default 12 check (age_max between age_min and 12),
  prompt text not null default '',
  correct_answer jsonb not null default '{}'::jsonb,
  distractors jsonb not null default '[]'::jsonb,
  interaction_config jsonb not null default '{}'::jsonb,
  audio_reference text,
  image_reference text,
  tags text[] not null default '{}',
  approval_status text not null default 'draft' check (approval_status in ('draft','in_review','approved','rejected')),
  created_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tafsir_question_approved_requires_review check (
    approval_status <> 'approved' or (
      length(trim(prompt)) > 0 and
      correct_answer <> '{}'::jsonb and
      reviewed_by is not null and reviewed_at is not null
    )
  )
);
create index if not exists tafsir_questions_game_idx on public.tafsir_questions(game_id, approval_status, difficulty);
create index if not exists tafsir_questions_content_idx on public.tafsir_questions(content_id);

create table if not exists public.tafsir_game_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  content_id uuid not null references public.tafsir_content(id) on delete cascade,
  question_id uuid not null references public.tafsir_questions(id) on delete cascade,
  game_id text not null,
  question_type text not null,
  is_correct boolean not null,
  used_hint boolean not null default false,
  response_time_ms integer check (response_time_ms is null or response_time_ms >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists tafsir_game_events_child_idx on public.tafsir_game_events(child_id, created_at desc);
create index if not exists tafsir_game_events_content_idx on public.tafsir_game_events(child_id, content_id, created_at desc);

create table if not exists public.tafsir_review_queue (
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  content_id uuid not null references public.tafsir_content(id) on delete cascade,
  error_type text not null default 'meaning',
  priority integer not null default 1 check (priority between 1 and 10),
  error_count integer not null default 0 check (error_count >= 0),
  correct_recovery_count integer not null default 0 check (correct_recovery_count >= 0),
  last_error_at timestamptz,
  last_correct_at timestamptz,
  next_review_at timestamptz not null default now(),
  last_game_id text,
  updated_at timestamptz not null default now(),
  primary key (child_id, content_id, error_type)
);
create index if not exists tafsir_review_queue_due_idx on public.tafsir_review_queue(child_id, next_review_at, priority desc);

alter table public.tafsir_content enable row level security;
alter table public.tafsir_questions enable row level security;
alter table public.tafsir_game_events enable row level security;
alter table public.tafsir_review_queue enable row level security;

drop policy if exists tafsir_content_approved_select on public.tafsir_content;
create policy tafsir_content_approved_select on public.tafsir_content
for select to authenticated
using (approval_status = 'approved');

drop policy if exists tafsir_questions_approved_select on public.tafsir_questions;
create policy tafsir_questions_approved_select on public.tafsir_questions
for select to authenticated
using (
  approval_status = 'approved'
  and exists (
    select 1 from public.tafsir_content c
    where c.id = content_id and c.approval_status = 'approved'
  )
);

drop policy if exists tafsir_game_events_related_select on public.tafsir_game_events;
create policy tafsir_game_events_related_select on public.tafsir_game_events
for select to authenticated
using (public.is_child_parent(child_id) or public.is_child_teacher(child_id));

drop policy if exists tafsir_review_queue_related_select on public.tafsir_review_queue;
create policy tafsir_review_queue_related_select on public.tafsir_review_queue
for select to authenticated
using (public.is_child_parent(child_id) or public.is_child_teacher(child_id));

revoke insert, update, delete on public.tafsir_content from authenticated;
revoke insert, update, delete on public.tafsir_questions from authenticated;
revoke insert, update, delete on public.tafsir_game_events from authenticated;
revoke insert, update, delete on public.tafsir_review_queue from authenticated;
grant select on public.tafsir_content, public.tafsir_questions, public.tafsir_game_events, public.tafsir_review_queue to authenticated;

create or replace function public.record_tafsir_game_event(
  p_child_id uuid,
  p_content_id uuid,
  p_question_id uuid,
  p_game_id text,
  p_question_type text,
  p_is_correct boolean,
  p_used_hint boolean default false,
  p_response_time_ms integer default null,
  p_metadata jsonb default '{}'::jsonb
) returns public.tafsir_game_events
language plpgsql security definer set search_path = public as $$
declare
  v_event public.tafsir_game_events;
  v_content public.tafsir_content;
  v_question public.tafsir_questions;
  v_error_type text;
begin
  if auth.uid() is null or not public.is_child_parent(p_child_id) then
    raise exception 'not_allowed';
  end if;

  select * into v_content from public.tafsir_content where id = p_content_id;
  select * into v_question from public.tafsir_questions where id = p_question_id;
  if v_content.id is null or v_question.id is null or v_question.content_id <> v_content.id then
    raise exception 'invalid_tafsir_question';
  end if;
  if v_content.approval_status <> 'approved' or v_question.approval_status <> 'approved' then
    raise exception 'content_not_approved';
  end if;
  if v_question.game_id <> p_game_id then
    raise exception 'game_mismatch';
  end if;

  insert into public.tafsir_game_events(
    child_id, content_id, question_id, game_id, question_type,
    is_correct, used_hint, response_time_ms, metadata
  ) values (
    p_child_id, p_content_id, p_question_id, p_game_id,
    coalesce(nullif(trim(p_question_type), ''), v_question.question_type),
    p_is_correct, coalesce(p_used_hint, false), p_response_time_ms, coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_event;

  v_error_type := coalesce(nullif(trim(p_question_type), ''), v_question.question_type, 'meaning');
  if p_is_correct then
    update public.tafsir_review_queue
       set correct_recovery_count = correct_recovery_count + 1,
           last_correct_at = now(),
           priority = greatest(1, priority - 1),
           next_review_at = case when correct_recovery_count + 1 >= 3 then now() + interval '7 days' else now() + interval '2 days' end,
           last_game_id = p_game_id,
           updated_at = now()
     where child_id = p_child_id and content_id = p_content_id and error_type = v_error_type;
  else
    insert into public.tafsir_review_queue(
      child_id, content_id, error_type, priority, error_count, last_error_at, next_review_at, last_game_id
    ) values (
      p_child_id, p_content_id, v_error_type, 3, 1, now(), now() + interval '12 hours', p_game_id
    )
    on conflict(child_id, content_id, error_type) do update set
      priority = least(10, public.tafsir_review_queue.priority + 2),
      error_count = public.tafsir_review_queue.error_count + 1,
      last_error_at = now(),
      next_review_at = least(public.tafsir_review_queue.next_review_at, now() + interval '12 hours'),
      last_game_id = excluded.last_game_id,
      updated_at = now();
  end if;

  return v_event;
end $$;

revoke all on function public.record_tafsir_game_event(uuid,uuid,uuid,text,text,boolean,boolean,integer,jsonb) from anon, public;
grant execute on function public.record_tafsir_game_event(uuid,uuid,uuid,text,text,boolean,boolean,integer,jsonb) to authenticated;
