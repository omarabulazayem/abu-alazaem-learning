# Supabase setup

The app uses Supabase for **Auth + PostgreSQL**.

## Required project variables

Client-safe:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Server:
- `SUPABASE_URL` (same project URL; may fall back to `VITE_SUPABASE_URL`)
- `SUPABASE_PUBLISHABLE_KEY`

The server deliberately uses the **publishable key plus the signed-in user's JWT**. Authorization is enforced with PostgreSQL Row Level Security (RLS) and narrowly scoped `SECURITY DEFINER` RPCs. The application does not need a Supabase secret/service-role key for normal runtime.

Legacy `*_ANON_KEY` variables are accepted only as a compatibility fallback.

Apply `supabase/migrations/0001_core_schema.sql` to the Supabase project.

## Account model

- `parent`: authenticated parent account. Owns one or more child profiles.
- `teacher`: authenticated teacher account. Owns classes and can access only children linked to those classes.
- `admin`: reserved platform administration role and cannot be self-selected during signup.
- Child profiles do **not** have separate email/password accounts. A child-mode PIN can be added later without changing the Auth model.

## Security model

- RLS is enabled on all application tables.
- Parent/teacher access is derived from `auth.uid()` and explicit relationships.
- Reward amounts are fixed inside `claim_learning_reward`; the client cannot choose arbitrary point values.
- Linking a child to a teacher class goes through `link_child_to_class` and requires a valid join code plus parent ownership of the child.
- Do not place Supabase secret/service-role keys in Vite variables, source control, or browser code.
