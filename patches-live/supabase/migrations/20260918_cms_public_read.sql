-- Public editorial reads, matching the behavior expected from a WordPress publishing layer.
-- Writes remain unavailable to anon/authenticated clients.

alter table public.cms_options add column if not exists is_public boolean not null default false;

drop policy if exists cms_content_published_select on public.cms_content;
create policy cms_content_published_select on public.cms_content for select to anon, authenticated using (status='publish');

drop policy if exists cms_content_meta_published_select on public.cms_content_meta;
create policy cms_content_meta_published_select on public.cms_content_meta for select to anon, authenticated using (exists(select 1 from public.cms_content c where c.id=content_id and c.status='publish'));

drop policy if exists cms_terms_select on public.cms_terms;
create policy cms_terms_select on public.cms_terms for select to anon, authenticated using (true);

drop policy if exists cms_taxonomies_select on public.cms_taxonomies;
create policy cms_taxonomies_select on public.cms_taxonomies for select to anon, authenticated using (true);

drop policy if exists cms_term_relationships_select on public.cms_term_relationships;
create policy cms_term_relationships_select on public.cms_term_relationships for select to anon, authenticated using (exists(select 1 from public.cms_content c where c.id=content_id and c.status='publish'));

drop policy if exists cms_media_select on public.cms_media;
create policy cms_media_select on public.cms_media for select to anon, authenticated using (true);

drop policy if exists cms_options_select on public.cms_options;
create policy cms_options_select on public.cms_options for select to anon, authenticated using (is_public=true);

drop policy if exists cms_navigation_select on public.cms_navigation;
create policy cms_navigation_select on public.cms_navigation for select to anon, authenticated using (true);

grant select on public.cms_content,public.cms_content_meta,public.cms_terms,public.cms_taxonomies,public.cms_term_relationships,public.cms_media,public.cms_options,public.cms_navigation to anon, authenticated;
revoke insert,update,delete on public.cms_content,public.cms_content_meta,public.cms_terms,public.cms_taxonomies,public.cms_term_relationships,public.cms_media,public.cms_options,public.cms_navigation from anon, authenticated;
