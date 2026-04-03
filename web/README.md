# OptiCore Web (Next.js 15)

**Full setup (Supabase + Auth + Chairman user):** see the repo root file **`SETUP_STEP_BY_STEP.md`**.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000/login`.

## Authentication (Supabase)

1. Copy `web/.env.example` → `web/.env.local` and set:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. Apply database SQL at repo root: `supabase/schema.sql` then `supabase/seed.sql`.

3. Create a user in **Supabase Auth** and link `public."User"` so `User.id = auth.users.id` and `role = chairman_admin`. See `supabase/auth-chairman.md`.

4. Sign in at `/login` with that Auth email/password. Protected routes: `/chairman/*`.
