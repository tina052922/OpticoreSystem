# Link Supabase Auth to `public."User"` (Chairman)

The Next.js app authenticates with **Supabase Auth** and authorizes **Chairman Admin** by reading `public."User".role` where **`User.id` equals `auth.users.id`** (same UUID string).

## 1) Create the Auth user

In Supabase Dashboard: **Authentication → Users → Add user**

- Set **email** and **password** (or use email signup flow).

Copy the new user’s **UUID** from the Users table (`auth.users.id`).

## 2) Upsert the app user row

If you already ran **`seed.sql`**, the demo chairman row uses **`employeeId` = `CTU-ARG-2023001`**.  
Inserting your real user with the same employee ID causes **duplicate key on `User_employeeId_key`**.  
Free it first (keeps sample schedules that reference the demo user id):

```sql
update public."User"
set "employeeId" = null
where id = 'demo-chairman-uid';
```

Then run in the SQL editor (replace placeholders):

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
  "collegeId" = excluded."collegeId",
  "employeeId" = excluded."employeeId";
```

**Or** use a **different** `employeeId` for your account (e.g. `CTU-ARG-2023999`) and skip the `update` above.

Ensure `col-tech-eng` exists in `"College"` (see `seed.sql`).

## 3) Sign in from the app

Use the same **email / password** as in Auth. The chairman area (`/chairman/*`) requires `role = 'chairman_admin'`.
