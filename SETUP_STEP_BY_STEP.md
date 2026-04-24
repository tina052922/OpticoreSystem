# OptiCore — Step-by-step setup (Supabase Auth + Next.js Chairman flow)

This guide walks you from zero to a working **Chairman Admin** login for the **Next.js 15** app in the `web/` folder.

---

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- A **Supabase** account ([supabase.com](https://supabase.com))
- This repository cloned on your machine

---

## Step 1 — Create a Supabase project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New project**.
3. Choose organization, name, database password, and region → **Create new project**.
4. Wait until the project is **healthy** (green).

You will use this project for PostgreSQL, Auth, and RLS policies.

---

## Step 2 — Apply database schema and seed data

1. In Supabase: **SQL Editor** → **New query**.
2. Open your local file **`supabase/schema.sql`** from this repo, copy its full contents, paste into the SQL editor, then **Run**.
3. Create a **new query**, open **`supabase/seed.sql`**, paste, **Run**.

This creates tables (including `public."User"`), RLS policies, and sample rows (college, programs, sections, subjects, rooms, etc.).

> If a statement fails because something already exists, read the error: you may need to run only the missing parts or reset a dev database.

---

## Step 2b — Apply migrations (`supabase/migrations/*`)

This repo also contains incremental SQL migrations under **`supabase/migrations/`** (new features, indexes, RLS updates).

Apply them to your Supabase project using **one** method:

- **Supabase CLI (recommended for dev)**:
  - Install CLI, then from repo root:
    - `supabase login`
    - `supabase link` (select the correct project)
    - `supabase db push`

- **Supabase Dashboard (SQL Editor)**:
  - Run the migration files in timestamp order.
  - If your project already has some changes, only run the missing ones.

If you skip this step, you may see errors like **403 RLS** or missing functions/policies for new modules.

---

## Step 3 — Get Supabase API keys for the web app

1. In Supabase: **Project Settings** (gear) → **API**.
2. Copy:
   - **Project URL** → use as `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Keep the **service_role** key private; the Next.js app uses the **anon** key with the user’s session (RLS applies).

---

## Step 3b — Configure Auth URLs (password reset & magic links)

Without this, **password reset emails** may open your app but **not** set the new password correctly.

1. Supabase: **Authentication** → **URL Configuration**.
2. **Site URL**: `http://localhost:3000` (local dev).
3. **Redirect URLs** — add:
   - `http://localhost:3000/auth/callback`
   - Optionally: `http://localhost:3000/**` (wildcard for local testing).

The app includes **`/auth/callback`** to exchange the email `code` for a session.

---

## Step 4 — Configure environment variables locally

1. In your repo, go to the **`web/`** folder.
2. Copy **`web/.env.example`** to **`web/.env.local`** (create the file if needed).
3. Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

4. Save the file.

If you will use server-side admin APIs (registration helpers), also set:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser; it must stay server-only.

---

## Step 5 — Create a Supabase Auth user (Chairman login)

1. In Supabase: **Authentication** → **Users**.
2. Click **Add user** → **Create new user**.
3. Enter **email** and **password** (this is what you will type on `/login`).
4. After the user is created, open the user row and **copy the user UUID** (this is `auth.users.id`).

---

## Step 6 — Link Auth user to `public."User"` (required for Chairman)

The app checks **`public."User".role`** for `chairman_admin` and matches **`User.id`** to **`auth.users.id`**.

1. In Supabase: **SQL Editor** → **New query**.
2. Run the following, replacing:
   - `PASTE_AUTH_USER_UUID_HERE` → the UUID from Step 5  
   - Adjust `email` / `name` / `employeeId` if you want  

```sql
insert into public."User" (id, "employeeId", email, name, role, "collegeId")
values (
  'PASTE_AUTH_USER_UUID_HERE',
  'CTU-ARG-2023001',
  'chairman.it@ctuargao.edu.ph',
  'Dr. Maria Santos',
  'chairman_admin',
  'col-tech-eng'
)
on conflict (id) do update set
  email = excluded.email,
  name = excluded.name,
  role = excluded.role,
  "collegeId" = excluded."collegeId";
```

3. **Run** the query.

`col-tech-eng` must exist in `"College"` (it is created by **`supabase/seed.sql`**).

More detail: **`supabase/auth-chairman.md`**.

---

## Step 7 — Install dependencies and run the Next.js app

From a terminal:

```bash
cd web
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** — you should be redirected toward login.

---

## Step 8 — Sign in and verify Chairman access

1. Open **[http://localhost:3000/login](http://localhost:3000/login)**.
2. Sign in with the **same email and password** you created in Supabase Auth (Step 5).
3. You should land in the Chairman area, e.g. **`/chairman/dashboard`** (red header, gray sidebar, orange accents).
4. Click **Logout** in the sidebar to confirm you return to login and can sign in again.

---

## Quick reference — URLs

| Page              | Path                 |
|-------------------|----------------------|
| Login             | `/login`             |
| Chairman dashboard| `/chairman/dashboard`|
| Other modules     | `/chairman/...`      |

---

## Troubleshooting

| Symptom | What to check |
|--------|----------------|
| “Supabase is not configured” / `supabase_config` | `web/.env.local` exists, variables are correct, dev server restarted after editing `.env.local`. |
| Login works but redirect to login with **forbidden** | `public."User"` row missing, wrong `id`, or `role` is not `chairman_admin`. Re-run Step 6 with the correct Auth UUID. |
| Cannot apply `schema.sql` | Run in order; fix SQL errors (extensions, permissions). Use a fresh project if needed. |
| RLS errors when reading `"User"` | Policies expect authenticated user; ensure you’re logged in via Auth and `User.id` matches `auth.uid()`. |

---

## Related files in this repo

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Tables + RLS |
| `supabase/seed.sql` | Sample data |
| `supabase/auth-chairman.md` | Short Auth ↔ `User` link notes |
| `web/README.md` | Web app env + commands |
| `web/middleware.ts` | Protects `/chairman/*`, refreshes session |
| `web/lib/auth/chairman-session.ts` | Server-side Chairman session |

---

## Production checklist (later)

- Use **HTTPS** and correct **Site URL** / redirect URLs in Supabase **Authentication → URL Configuration**.
- Never expose **service_role** in the browser.
- Review RLS policies for each role before go-live.
