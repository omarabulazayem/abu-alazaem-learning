# Project status

Current primary application: `netlify-app` (React + Vite) backed by Supabase Auth/PostgreSQL/RPC.

- Game metadata is centralized in `netlify-app/src/gameRegistry.js`.
- Live games use the existing GameEngine; unfinished/content-blocked games are not exposed as live.
- Quran text is generated into `netlify-app/public/quran/quran-data.json` and consumed through `quranCorpus.js`.
- Supabase migrations are tracked under `patches-live/supabase/migrations`.
- `source.tgz + patches-live` remains a separate Railway/Render legacy full-stack build path.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the authoritative repository/deployment map.

## Current V7 teaching-loop status
- Scheduled lessons are bound to the unified teaching room; teachers can start a lesson from the schedule, run the live whiteboard, and finalize the session from the room.
- Closing a lesson records an optional teacher note, finalizes billing through the canonical session RPC, and clears ephemeral whiteboard state.
- Teacher student reports include lesson history, game/ayah performance, enrollment-scoped point history, bonus and auditable point reversal actions.
- In-app notifications are now event-driven from Supabase for task, lesson, tuition, point, enrollment, and weekly leaderboard events, with role-specific actionable navigation in teacher/family workspaces.
- Family notification links can select the referenced child and focus the exact task/session/point/billing row; teacher task alerts can focus the submitted assignment.
- Lesson reminders now have an idempotent parent RPC plus a private database scheduler that materializes reminders automatically for scheduled lessons within 24 hours; the family workspace also reconciles them on load for immediacy.
- Email remains a delivery channel foundation only; automated external email sending is not yet wired to a provider.
- Teacher SaaS subscription foundation is now modeled with plans, teacher subscription state, provider-neutral webhook events, and protected admin plan management. A payment gateway provider and live checkout/webhook endpoint are still intentionally not wired.
- Teachers can now select an active SaaS plan before checkout; active/manual/trial subscriptions cannot be switched through this pre-checkout control, preserving payment integrity until a gateway is connected.
- Teacher workspace settings expose timezone, late-cancellation window, leaderboard privacy and podium rewards; family users can cancel future scheduled lessons and the canonical policy RPC determines early versus late cancellation.

