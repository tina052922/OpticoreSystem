# OptiCore — clean end-to-end QA (Chairman → Instructor → DOI)

This guide matches a database prepared with `supabase/scripts/reset_for_clean_e2e_testing.sql` and a trimmed `supabase/seed.sql` (four admin users only in seed data).

## 1. One-time: reset database and Auth

1. In **Supabase → SQL Editor**, run `supabase/scripts/reset_for_clean_e2e_testing.sql`.
2. In **Authentication → Users**, delete Auth users that no longer exist in `public."User"` (the script comments list the usual seed UUIDs for CAS, seed instructor, student, visitor). Keep Auth users for the four admins (and optionally remove stale users only).
3. Confirm **Realtime** is enabled for `public."ScheduleEntry"` (and related tables your deployment uses) under **Database → Replication**, so INS views update after saves.

## 2. Accounts that should exist

### Login accounts (create in Supabase Auth if missing; `public."User".id` must equal `auth.users.id`)

| Role | Email (example) | `public."User".id` |
|------|-------------------|---------------------|
| Program Chairman (BSIT) | `macalisangchristina@gmail.com` | `9a727fde-53b7-4463-8c36-fa7614945a7a` |
| College Admin (COTE) | `college.admin@opticore.local` | `7f77000a-bf51-43ed-b52e-a27a3e8add6c` |
| GEC Chairman | `gec.chairman@opticore.local` | `41288bb4-7b5e-49d0-b02a-b8d20c2d701e` |
| DOI Admin | `doi.admin@opticore.local` | `3424c55e-d871-47a3-8134-1d339717e7ca` |

Set passwords in the Supabase Dashboard (or your usual dev policy). The alternate file `supabase/seed_auth.sql` uses different UUIDs; prefer matching the table above to `seed.sql`.

### System user (no login)

| Purpose | `public."User".id` |
|---------|---------------------|
| GEC “Vacant (TBD)” instructor on plots | `a0000000-0000-4000-8000-000000000099` |

This row is created by migration `20260413120000_gec_chairman_schedule_placeholder_and_rls.sql`. The web app defaults `NEXT_PUBLIC_GEC_VACANT_INSTRUCTOR_ID` to this UUID. Do not delete it.

### Instructors

There are **no** seeded instructor logins. Instructors are created through **Register instructor** (`/register/instructor`): **Gmail address**, Employee ID, college. The API creates the Auth user with a **temporary password**, sets `must_change_password` in user metadata, and emails the password when `RESEND_API_KEY` is configured. On first login, middleware forces a password change. This is **not** Supabase’s email OTP flow; enabling OTP/magic link would be a separate Dashboard product change.

## 3. Step-by-step test flow

### A. Program Chairman — plot and save

1. Log in as **Program Chairman**.
2. Open **Evaluator** (program worksheet), select the **academic period** (semester filter).
3. Add rows: subject, section, room, time; assign **instructor** (real instructor after they exist, or **Vacant (TBD)** for GEC curriculum codes).
4. Use **Save**; confirm **conflict** highlighting and filters still behave.
5. Open **INS Forms** (chairman view) and confirm the same period shows the new entries (Realtime + refresh as needed).

### B. Forward visibility to College Admin

1. Use your in-app workflow (workflow inbox / mail) so **College Admin** can see the schedule state you expect for the test.
2. Log in as **College Admin** and confirm schedules appear in **INS Forms** / college views for the same period.

### C. GEC Chairman — vacant GEC slots (if applicable)

1. If your flow requires approval for GEC vacant editing, complete **Access request** / college approval for `gec_vacant_slots` per your deployment.
2. Log in as **GEC Chairman**.
3. Edit rows that use **GEC-%** / **GEE-%** subjects and the **Vacant (TBD)** instructor where allowed; **Save**.
4. Confirm updates in **Central Hub** and **INS Forms** for Chairman, College Admin, and GEC Chairman.

### D. Instructor registration and schedule

1. Ensure the **Employee ID** used in the Evaluator (or Faculty Profile placeholder) matches what the instructor will enter at registration (product rule: Employee ID is the join key).
2. Open `/register/instructor`, register with a **@gmail.com** address.
3. Retrieve the **temporary password** (email or dev response if email is off).
4. Log in; complete **forced password change** when prompted.
5. Open **My Schedule** / faculty INS — entries plotted to that instructor (or merged from placeholder) should appear; otherwise empty until assigned.

### E. College Admin and DOI — review and finalize

1. Log in as **College Admin**; review schedule and justification flows as required.
2. Log in as **DOI Admin**; run **review / approve / publish** (or clear locks) per your DOI UI. After publication, chairman-side edits may be blocked (`lockedByDoiAt`); use `supabase/scripts/clear_doi_publication_for_manual_retest.sql` if you need to reset a term for another pass.

## 4. Files reference

- `supabase/scripts/reset_for_clean_e2e_testing.sql` — data reset for QA.
- `supabase/scripts/clear_doi_publication_for_manual_retest.sql` — unlock a published term without wiping catalog data.
- `supabase/seed.sql` — colleges, periods, rooms, subjects, four admins.
