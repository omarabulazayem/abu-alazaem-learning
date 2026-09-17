-- CMS compatibility layer inspired by WordPress concepts without forcing domain data into wp_posts.
-- This layer is for editorial/site content, media, taxonomies and options.
-- Child/game/progress/auth data remain in dedicated domain tables.

create table if not exists public.cms_content (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  content_type text not null,
  slug text not null,
  title text not null default '',
  excerpt text not null default '',
  body jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','pending','private','publish','trash')),
  parent_id uuid references public.cms_content(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  featured_media_id uuid,
  menu_order integer not null default 0,
  locale text not null default 'ar',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(content_type,slug,locale)
);
create index if not exists cms_content_type_status_idx on public.cms_content(content_type,status,published_at desc);
create index if not exists cms_content_parent_idx on public.cms_content(parent_id,menu_order);

create table if not exists public.cms_content_meta (
  id bigserial primary key,
  content_id uuid not null references public.cms_content(id) on delete cascade,
  meta_key text not null,
  meta_value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists cms_content_meta_lookup_idx on public.cms_content_meta(content_id,meta_key);

create table if not exists public.cms_terms (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  name text not null,
  slug text not null,
  locale text not null default 'ar',
  created_at timestamptz not null default now(),
  unique(slug,locale)
);

create table if not exists public.cms_taxonomies (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.cms_terms(id) on delete cascade,
  taxonomy text not null,
  description text not null default '',
  parent_id uuid references public.cms_taxonomies(id) on delete set null,
  sort_order integer not null default 0,
  unique(term_id,taxonomy)
);
create index if not exists cms_taxonomies_type_idx on public.cms_taxonomies(taxonomy,parent_id,sort_order);

create table if not exists public.cms_term_relationships (
  content_id uuid not null references public.cms_content(id) on delete cascade,
  taxonomy_id uuid not null references public.cms_taxonomies(id) on delete cascade,
  sort_order integer not null default 0,
  primary key(content_id,taxonomy_id)
);

create table if not exists public.cms_media (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  storage_provider text not null default 'remote',
  storage_key text,
  source_url text not null,
  mime_type text,
  width integer,
  height integer,
  alt_text text not null default '',
  title text not null default '',
  caption text not null default '',
  credit text not null default '',
  license_name text not null default '',
  license_url text,
  source_page_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cms_media_provider_idx on public.cms_media(storage_provider,created_at desc);

alter table public.cms_content
  drop constraint if exists cms_content_featured_media_fk;
alter table public.cms_content
  add constraint cms_content_featured_media_fk foreign key(featured_media_id) references public.cms_media(id) on delete set null;

create table if not exists public.cms_options (
  option_key text primary key,
  option_value jsonb not null default 'null'::jsonb,
  autoload boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_navigation (
  id uuid primary key default gen_random_uuid(),
  location text not null,
  label text not null,
  url text,
  content_id uuid references public.cms_content(id) on delete set null,
  parent_id uuid references public.cms_navigation(id) on delete cascade,
  sort_order integer not null default 0,
  locale text not null default 'ar',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists cms_navigation_location_idx on public.cms_navigation(location,locale,parent_id,sort_order);

alter table public.cms_content enable row level security;
alter table public.cms_content_meta enable row level security;
alter table public.cms_terms enable row level security;
alter table public.cms_taxonomies enable row level security;
alter table public.cms_term_relationships enable row level security;
alter table public.cms_media enable row level security;
alter table public.cms_options enable row level security;
alter table public.cms_navigation enable row level security;

-- Published editorial data is readable by authenticated application users.
drop policy if exists cms_content_published_select on public.cms_content;
create policy cms_content_published_select on public.cms_content for select to authenticated using (status='publish');
drop policy if exists cms_content_meta_published_select on public.cms_content_meta;
create policy cms_content_meta_published_select on public.cms_content_meta for select to authenticated using (exists(select 1 from public.cms_content c where c.id=content_id and c.status='publish'));
drop policy if exists cms_terms_select on public.cms_terms;
create policy cms_terms_select on public.cms_terms for select to authenticated using (true);
drop policy if exists cms_taxonomies_select on public.cms_taxonomies;
create policy cms_taxonomies_select on public.cms_taxonomies for select to authenticated using (true);
drop policy if exists cms_term_relationships_select on public.cms_term_relationships;
create policy cms_term_relationships_select on public.cms_term_relationships for select to authenticated using (exists(select 1 from public.cms_content c where c.id=content_id and c.status='publish'));
drop policy if exists cms_media_select on public.cms_media;
create policy cms_media_select on public.cms_media for select to authenticated using (true);
drop policy if exists cms_options_select on public.cms_options;
create policy cms_options_select on public.cms_options for select to authenticated using (true);
drop policy if exists cms_navigation_select on public.cms_navigation;
create policy cms_navigation_select on public.cms_navigation for select to authenticated using (true);

grant select on public.cms_content,public.cms_content_meta,public.cms_terms,public.cms_taxonomies,public.cms_term_relationships,public.cms_media,public.cms_options,public.cms_navigation to authenticated;
revoke insert,update,delete on public.cms_content,public.cms_content_meta,public.cms_terms,public.cms_taxonomies,public.cms_term_relationships,public.cms_media,public.cms_options,public.cms_navigation from authenticated;

comment on table public.cms_content is 'WordPress mapping: wp_posts-like editorial entities only; domain records stay outside CMS.';
comment on table public.cms_content_meta is 'WordPress mapping: wp_postmeta-like structured metadata.';
comment on table public.cms_terms is 'WordPress mapping: wp_terms-like term identity.';
comment on table public.cms_taxonomies is 'WordPress mapping: wp_term_taxonomy-like taxonomy membership and hierarchy.';
comment on table public.cms_term_relationships is 'WordPress mapping: wp_term_relationships-like content-term links.';
comment on table public.cms_media is 'WordPress mapping: Media Library / attachment metadata with explicit licenses and credits.';
comment on table public.cms_options is 'WordPress mapping: wp_options-like site configuration; use sparingly.';
