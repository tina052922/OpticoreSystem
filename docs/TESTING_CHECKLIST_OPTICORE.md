# OptiCore manual testing checklist

Use after releases or changes to scheduling, INS, GEC access, auth, RLS, profile uploads, and role-based views.

**Before instructor INS tests:** apply migrations (including `20260502140000_scheduleentry_select_instructor_college_ins.sql`) so instructors can read college-wide schedule rows for INS browse.

---

## 1. Authentication & landing

- [ ] **Program Chairman** — login → dashboard; routes under `/chairman` work; evaluator + INS.
- [ ] **College Admin** — login → `/admin/college`; college-scoped tools load.
- [ ] **CAS Admin** — login → CAS dashboard (smoke).
- [ ] **GEC Chairman** — login → `/admin/gec`; per-college access respected.
- [ ] **DOI Admin** — login → `/doi/dashboard`; VPAA flows (smoke).
- [ ] **Instructor** — login → **Campus Intelligence** (`/faculty`); sidebar: Campus Intelligence, **My schedule**, INS Form, Announcements, Campus navigation.
- [ ] **Student** — `/student` (smoke).
- [ ] **Visitor** — campus navigation only; admin routes blocked.

---

## 2. Instructor — Campus Intelligence & My schedule

- [ ] Open **Campus Intelligence** (`/faculty`): term selector in shell matches data cards; weekly hours / block count / student count look plausible.
- [ ] Change term → dashboard refetches (loading state, no error).
- [ ] **My schedule** (`/faculty/schedule`): same body as dashboard focus; links to INS + request change work.
- [ ] Instructor **without** `collegeId`: friendly message on INS; dashboard behavior acceptable.

---

## 3. Instructor — INS Form (`/faculty/ins?tab=`)

- [ ] **Tabs** — Faculty view / Section view / Room view switch without losing shell; counts on grouping strip match expectations.
- [ ] **Faculty tab** — Search lists instructors with classes in the college; default shows **your** load; selecting another faculty shows their grid **read-only**; **Request schedule change** only when viewing yourself; cell click opens modal only for yourself.
- [ ] **Section tab** — Section search lists college sections; grid updates; **no** “Run Conflict Check”; **My schedule** + **Print / PDF** only in toolbar; form read-only.
- [ ] **Room tab** — Same as section: search, no conflict run, read-only.
- [ ] **Print** — Print/PDF from each tab produces a sensible layout.
- [ ] **Realtime / reflection** — With a second browser as College Admin or Chairman, change a plotted slot → within ~20s or after focus, instructor INS grids update (or soft-refresh confirms).

---

## 4. Other roles — INS parity (regression)

- [ ] **Chairman / College Admin / DOI / GEC** — Faculty + Section + Room; conflict check and admin-only tools still present where expected.
- [ ] **Signer labels** — College Admin / DOI editors save and appear on print after reload (unchanged).

---

## 5. Scheduling & data reflection

- [ ] Chairman (or college) **Evaluator**: plot/edit → **Save** → same term INS + instructor views show the same slot.
- [ ] **Hours / load** — Instructor Faculty INS (self) vs Campus Intelligence weekly hours vs Evaluator load: same term, no systematic drift (known fix: college-wide rows + `ignoreProgramScope` for 5A).

---

## 6. GEC Chairman — per-college access

- [ ] Request access for college A only → approve as College Admin A → vacant GEC edits allowed with A selected.
- [ ] College B without approval → vacant GEC edits blocked until approved for B.

---

## 7. Instructor — schedule change request

- [ ] From **Faculty** INS (self), open request (toolbar or cell) → submit → College Admin queue shows it → approve/deny → instructor sees outcome (smoke).

---

## 8. Policy justification

- [ ] Evaluator overload past cap → justification capture → save → DOI/college sees justification per your workflow.

---

## 9. Conflicts & alternatives (admin only)

- [ ] **Run Conflict Check** on INS (not on instructor portal) and in evaluator contexts; **Apply alternative** where enabled; rows and totals update.

---

## 10. Profile picture & signature

- [ ] Avatar upload under configured limit (e.g. &lt; 10 MB) succeeds; over limit rejected clearly.
- [ ] Signature upload same.

---

## 11. Security & RLS (spot checks)

- [ ] Instructor cannot open `/admin/college` or `/chairman` routes (redirect/forbidden).
- [ ] Student cannot read other students’ private data (smoke).
- [ ] **Instructor ScheduleEntry** — can read own rows + rows for sections in home college (INS browse); cannot update `ScheduleEntry` via UI (no evaluator on instructor).

---

## 12. Cross-browser smoke

- [ ] Logout/login; password change redirect for instructor lands on `/faculty`.

---

*Keep steps outcome-based (observable UI). Extend when adding workflows.*
