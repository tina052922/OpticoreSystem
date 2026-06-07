# AGENTS.md

## Cursor Cloud specific instructions

OptiCore’s runnable app is **`web/`** (Next.js 15 on port **3000**). There is no local Postgres or Docker stack — auth and data come from a **hosted Supabase** project.

### Services

| Service | Command | Notes |
|---------|---------|-------|
| Next.js dev | `cd web && npm run dev` | Only process required locally |
| Supabase | Cloud dashboard | Set `web/.env.local` from `web/.env.example`; restart dev after changes |

### Lint / test / build

Run from `web/`:

- `npm run lint` — ESLint (warnings only as of setup)
- `npm test` — Vitest (36 tests)
- `npm run build` — production build (needs valid Supabase env for some routes)

### Supabase env (required for login)

Copy `web/.env.example` → `web/.env.local` and fill:

- `NEXT_PUBLIC_SUPABASE_URL` — must be the real Project URL (`https://<ref>.supabase.co`), not the doc placeholder `YOUR_PROJECT_REF`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon public key
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; needed for registration and conflict-scan APIs

Login calls `signInWithPassword` against that URL. If the hostname does not resolve, the browser shows `net::ERR_NAME_NOT_RESOLVED` and `TypeError: Failed to fetch`.

In Supabase **Authentication → URL Configuration**, set Site URL `http://localhost:3000` and redirect `http://localhost:3000/auth/callback`.

Demo password (when auth user exists): `OptiCore2026!`. On the linked Supabase project, `doi.admin@opticore.local` works for DOI portal smoke tests. Seed accounts like `chairman.admin@opticore.local` only work after `supabase/seed_auth.sql` is applied. See `SETUP_STEP_BY_STEP.md`.

Secrets can be injected as Cursor secrets (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`); write them to `web/.env.local` and restart `npm run dev`.

### Common console noise

`A listener indicated an asynchronous response...` on `login:1` is usually a **browser extension** (password manager, ad blocker), not the app.
