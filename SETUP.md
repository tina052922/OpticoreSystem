# OptiCore: Campus Intelligence — setup tutorial

This guide is for a **new laptop** or teammate cloning the repo. The app is **Next.js 15** + **Tailwind** + **TypeScript** + **Supabase** (Postgres + Auth).

---

## 1. Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** (comes with Node)
- A **Supabase** project (free tier is fine)
- **Git** (optional, for GitHub)

---

## 2. Clone and install

```bash
git clone https://github.com/tina052922/OpticoreSystem.git
cd OpticoreSystem/web
npm install
```

---

## 3. Connect to Supabase

1. In [Supabase Dashboard](https://supabase.com/dashboard), open your project.
2. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key (use the `anon` key in the browser app, not the `service_role` key in client code).

3. In `web/`, create **`.env.local`** (this file is gitignored):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

4. Apply database schema and migrations:

   - Either use **Supabase SQL Editor** and run files from `supabase/` in order (`schema.sql`, then each `migrations/*.sql`),  
   - Or use **Supabase CLI**: `supabase link` then `supabase db push` (if you use the CLI workflow).

5. **Auth users** must have matching rows in `public."User"` with `id` = Supabase Auth user id (see `supabase/seed.sql` comments).

6. **Realtime (optional but recommended)** for live INS + notifications + inbox refresh:

   - Dashboard → **Database → Replication** (or Publications)  
   - Enable replication for: `Notification`, `ScheduleEntry`, `WorkflowInboxMessage`  
   - Exact steps vary slightly by Supabase version; see [Supabase Realtime docs](https://supabase.com/docs/guides/realtime).

---

## 4. Run the project locally

```bash
cd web
npm run dev
```

Open **http://localhost:3000**. Sign in with a user that exists in both **Supabase Auth** and **`public."User"`**.

---

## 5. Push changes to GitHub

From the repo root (or `web` if that is your only tracked tree):

```bash
git status
git add .
git commit -m "Describe your change"
git remote add origin https://github.com/tina052922/OpticoreSystem.git
# if origin already exists, skip the line above
git branch -M main
git push -u origin main
```

Use a **Personal Access Token** (HTTPS) or **SSH keys** when Git prompts for credentials.

**Never commit** `.env.local` or service role keys.

---

## 6. Feature notes (this codebase)

- **Evaluator → database**: Chairman saves **local draft** rows with **Save drafts to database**; that **upserts** `ScheduleEntry`. College Admins get **Notification** rows when a chairman saves (after migration + RLS).
- **INS Form (Faculty)**: With a **college scope** (Chairman or College Admin INS page), the grid reads **`ScheduleEntry`** and subscribes to Realtime changes.
- **Inbox**: `WorkflowInboxMessage` stores forwarded/shared mail for **College Admin** (and other roles) when the migration is applied; the UI still merges **in-memory** demo messages for local dev.
- **Conflict check**: Evaluator has **Run full conflict check** with row highlighting; messages explain instructor / room / section overlaps.

For questions specific to CTU Argao workflows, keep `supabase/seed.sql` and role labels in `web/lib/role-labels.ts` aligned with your deployment.
