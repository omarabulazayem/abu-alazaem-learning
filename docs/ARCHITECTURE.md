# Platform architecture

> **Product requirements authority:** `docs/MASTER_PRD_V7.md` is the highest-level product source of truth. This file describes the repository's technical reality. If current implementation behavior conflicts with an approved V7 product rule, engineering should plan a migration toward V7 rather than treating the legacy behavior as the requirement.

This document describes the repository as it actually operates today. It is intentionally explicit because the repository contains two deployment lineages.

## Primary application: netlify-app

`netlify-app/` is the canonical source for the current child/family/teacher learning UI and Quran games. It is a React 19 + Vite application. `netlify.toml` builds this directory directly with `npm run build` and publishes `netlify-app/dist`. GitHub Pages also builds this same application as a secondary static deployment.

The Netlify application talks directly to Supabase through `netlify-app/src/api.js` using Supabase Auth, REST and RPC. Durable learning state, children, game sessions, review queues, rewards and teacher data live in Supabase PostgreSQL. Browser storage is used only for client session/active-child selection where appropriate; it is not the durable learning database.

## Quran data

The generated Quran corpus is `netlify-app/public/quran/quran-data.json`, produced by `netlify-app/scripts/build-quran-data.mjs`. Application code reads it through `src/quranCorpus.js`. Static surah names/order/count metadata lives separately in `src/surahCatalog.js`. Do not manually edit Quran text in components or generated data.

## Games

`netlify-app/src/gameRegistry.js` is the single metadata source of truth for every known game. A game is visible to children only when its status is `live`. Runtime session/progress/review behavior is handled by `src/gameEngine.js`. Game components remain grouped in the existing Quran game component files; the registry describes their public availability and metadata.

## Supabase and migrations

Supabase is the active database/authentication backend for the Netlify application. SQL migrations are source-controlled under `patches-live/supabase/migrations/`. A migration file in Git is a record of intended schema; production migrations must still be applied to the connected Supabase project through the migration workflow/tooling.

Master PRD V7 defines the target product model, including TeacherWorkspace, Enrollment, recurring schedules, session billing entries, append-only PointLedger, Global Wallet, immutable leaderboard snapshots, teacher SaaS subscriptions, notifications and audit logs. These concepts should be introduced through controlled migrations rather than parallel storage systems.

## Legacy/secondary full-stack path: source.tgz + patches-live

`source.tgz` is an archived base full-stack application. `railway-bootstrap.mjs` extracts it into the repository root at build time, then recursively overlays `patches-live/`. The root `package.json` then installs/builds that extracted application. `Dockerfile` performs the same extract-and-overlay process.

This path is separate from `netlify-app` and is not the canonical source for the current Netlify learning UI. Do not duplicate a feature into both paths automatically.

## Railway / Render

The repository contains Railway bootstrap infrastructure at the root. Render is configured through `render.yaml` to build the root Dockerfile from an older deployment lineage. Treat that as legacy/staging unless a later deployment decision explicitly changes the source of truth.

## Authentication

For `netlify-app`, authentication is Supabase Auth. `api.js` manages sign-in/sign-up/recovery/session refresh and reads profile roles from Supabase.

Master PRD V7 defines Child Mode as a parent-authenticated scoped experience protected by a 4-digit exit PIN, not an independent child login in MVP.

## Deployment source-of-truth table

| Concern | Source of truth |
| --- | --- |
| Product requirements | `docs/MASTER_PRD_V7.md` |
| Current web UI | `netlify-app/` |
| Netlify deploy | `netlify.toml` → `netlify-app/dist` |
| GitHub Pages deploy | `.github/workflows/deploy-github-pages.yml` → `netlify-app/dist` |
| Auth + DB | Supabase Auth + PostgreSQL |
| Game metadata | `netlify-app/src/gameRegistry.js` |
| Game runtime | `netlify-app/src/gameEngine.js` + game components |
| Quran generated corpus | `netlify-app/public/quran/quran-data.json` |
| Supabase migration files | `patches-live/supabase/migrations/` |
| Brand identity | `docs/BRAND_IDENTITY.md` |
| Railway/root legacy app | `source.tgz` + `patches-live/` overlay |

## Rule for future development

New current-platform features belong in `netlify-app` and must use the existing Supabase/GameEngine/Quran layers while moving the product toward Master PRD V7. Do not create a parallel game registry, Quran text source, point system, reward system, enrollment model, leaderboard model, or review system.

If an existing implementation contradicts V7, document the gap and migrate it deliberately instead of preserving the old behavior as a requirement.
