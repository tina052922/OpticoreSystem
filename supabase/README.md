# Supabase (OptiCore)

## Files

- `schema.sql`: tables + indexes/triggers + RLS policies (chairman scoped to college)
- `seed.sql`: small realistic seed aligned with the capstone sample data

## Apply

Run these in the Supabase SQL editor (or `psql`) in order:

1. `schema.sql`
2. `seed.sql` — public data (one `User` per role) and fixed UUIDs
3. `seed_auth.sql` — creates matching `auth.users` + `auth.identities` so email/password login works (see comments in the file for password)

## Notes

- The schema uses quoted identifiers like `"User"` to match the DBML table name.
- `public."User".id` must match `auth.users.id` (same UUID string as `auth.uid()::text` after login).
- `seed_auth.sql` deletes and re-INSERTs the eight demo auth users so it can be re-run in dev; **do not run the DELETE block on production** unless you intend to remove those accounts.
- If `seed.sql` fails with **23514** on `cas_admin`, your `User` table still had an old role CHECK. Re-run the **end** of `schema.sql` (the `User_role_check` block) or `upgrade_add_cas_admin_role.sql`, then run `seed.sql` again.
- If you created users in the Supabase Dashboard, **do not run `seed_auth.sql`** (UUIDs would conflict). Keep `public."User".id` equal to each Auth user’s UID and emails aligned (see comments in `seed.sql`).
