# Project status

Current primary application: `netlify-app` (React + Vite) backed by Supabase Auth/PostgreSQL/RPC.

- Game metadata is centralized in `netlify-app/src/gameRegistry.js`.
- Live games use the existing GameEngine; unfinished/content-blocked games are not exposed as live.
- Quran text is generated into `netlify-app/public/quran/quran-data.json` and consumed through `quranCorpus.js`.
- Supabase migrations are tracked under `patches-live/supabase/migrations`.
- `source.tgz + patches-live` remains a separate Railway/Render legacy full-stack build path.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the authoritative repository/deployment map.
