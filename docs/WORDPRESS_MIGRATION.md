# WordPress Compatibility Strategy

The current application remains React + Supabase. The goal is to keep the data model easy to migrate into WordPress later without degrading the current platform into a copy of WordPress internals.

## Principle

Use WordPress-like concepts for editorial content only, while keeping learning-domain records in purpose-built tables.

### CMS/editorial layer

| Current table | WordPress destination |
| --- | --- |
| `cms_content` | `wp_posts` / custom post types |
| `cms_content_meta` | `wp_postmeta` |
| `cms_terms` | `wp_terms` |
| `cms_taxonomies` | `wp_term_taxonomy` |
| `cms_term_relationships` | `wp_term_relationships` |
| `cms_media` | Media Library / attachment posts + attachment meta |
| `cms_options` | `wp_options` |
| `cms_navigation` | Navigation menus / Navigation block data |

`external_id` exists so migrated WordPress IDs can be retained without changing the application's UUID primary keys before migration.

## What should become WordPress content

Good candidates:

- Landing pages.
- Learning articles and guides.
- Approved Tafsir explanations.
- Teacher resources.
- Help pages.
- Game editorial descriptions and marketing copy.
- Visual assets and their attribution/license metadata.
- Menus and general site options.

Suggested `content_type` values map naturally to Custom Post Types:

- `page`
- `article`
- `tafsir_item`
- `teacher_resource`
- `help_item`
- `game_story`

## What should NOT be flattened into `wp_posts`

Keep these relational/domain-first even after a future WordPress migration unless a deliberate integration design changes them:

- `child_profiles`
- `learning_progress`
- `game_sessions`
- `game_ayah_events`
- `game_progress`
- `review_queue`
- `reward_ledger`
- `achievements`
- `classes`
- `class_students`
- `tafsir_game_events`
- `tafsir_review_queue`

If WordPress becomes the application shell later, these tables can remain custom WordPress tables accessed through a plugin REST API. This is preferable to putting millions of game events into `wp_postmeta`.

## API boundary

UI components should not know whether editorial content came from Supabase or WordPress. Future work should introduce repository functions such as:

- `getContentBySlug(type, slug, locale)`
- `listContent(type, filters)`
- `getMedia(id)`
- `getNavigation(location, locale)`
- `getOption(key)`

Today these functions can query Supabase. During migration, the implementation can switch to WordPress REST endpoints while the React UI remains largely unchanged.

## Media migration

`cms_media` intentionally stores:

- source URL
- source page URL
- alt text
- title/caption
- author/credit
- license name and license URL
- width/height/mime

This maps cleanly to WordPress Media Library fields and attachment metadata.

Do not use remote images permanently without preserving source/license metadata. Prefer downloading approved images into managed storage or the future WordPress Media Library.

## Tafsir migration

`tafsir_content` remains a reviewed religious-content domain model. If moved to WordPress, the recommended mapping is a `tafsir_item` Custom Post Type plus structured custom fields for:

- `surah_number`
- `ayah_start`
- `ayah_end`
- source name/author/reference
- original source text
- child-friendly explanation
- review status
- reviewer
- reviewed date

Only approved items are child-facing. Never convert review state into a visual-only flag.

## Migration phases

1. Keep Supabase as current source of truth.
2. Move public/editorial text into the CMS layer instead of hardcoding it in components.
3. Add repository/service functions around CMS reads.
4. Import CMS content and media to WordPress when required.
5. Point repository functions at WordPress REST API.
6. Move authentication only if there is a clear reason; do not combine it with content migration automatically.
7. Keep game/session/progress tables as dedicated data tables via a WordPress plugin if WordPress becomes the final application platform.

## Why not copy WordPress schema now?

WordPress schema is optimized around publishing and extensibility, not high-volume learning telemetry. Exact replication now would create unnecessary EAV-style queries and make GameEngine analytics worse. The compatibility layer keeps the concepts portable while preserving a proper relational learning backend.
