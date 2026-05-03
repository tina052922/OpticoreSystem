# OptiCore manual testing checklist

Use after releases or changes to scheduling, INS, GEC access, auth, RLS, profile uploads, and role-based views.

**Before instructor INS tests:** apply migrations including `20260502140000_scheduleentry_select_instructor_college_ins.sql` (college INS browse), **`20260502160000_studentprofile_select_instructor_roster.sql`**, and **`20260502180000_fix_scheduleentry_studentprofile_rls_recursion.sql`** (fixes “infinite recursion” on `ScheduleEntry` / restores rows).

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

## 13. Cross-user alignment, reflection & flows (system test)

Use **two browsers or profiles** (e.g. Chairman + Instructor, or College Admin + Instructor). Confirm **same term** selected where applicable.

### Data alignment

- [ ] **Schedule vs INS** — After Chairman/GEC saves a slot, `ScheduleEntry.roomId` / day / times match on Instructor INS (Faculty self) and Campus Intelligence for that term (within realtime + soft reload window).
- [ ] **Room labels** — Campus navigation `Room.displayName` / code appear consistently in Evaluator, GEC plotting, and INS Room tab.

### Scheduling flow

- [ ] Chairman Evaluator (or BSIT worksheet) → save draft/final row → row appears in merged grid and in conflict scan inputs.
- [ ] DOI lock — After VPAA publish (`lockedByDoiAt` set), chairman cannot mutate row; schedule-change API returns **423** when applying moves.

### Navigation flow

- [ ] Instructor **Campus navigation** route loads; links back to faculty shell work.
- [ ] Building → Room cascades use same `Room.building` grouping as catalog (COTE vs other buildings).

### Schedule change request flow

- [ ] Instructor submits request (API `POST /api/faculty/schedule-change-request`) → College Admin list updates (Realtime or refresh) → approve → `ScheduleEntry` day/start/end match request → instructor notification or UI reflects decision.

### Policy justification flow

- [ ] Trigger overload in Evaluator → **Policy justification** modal → save `ScheduleLoadJustification` → DOI / college policy review UI shows row (see role-specific pages).

### Updates across users (reflection)

- [ ] **`ScheduleEntry`** — Second session sees changes via Realtime on `ScheduleEntry` (see `useScheduleEntryCrossReload`, `useInsCatalog`) or within ~8s polling fallback when publication is missing.
- [ ] **`ScheduleChangeRequest`** — Pending count badge / college workspace list refresh on insert/update (Realtime + 45s poll fallback in `usePendingScheduleChangeRequestsCount`).
- [ ] **`Notification`** — Bell / list updates when triggers insert rows (spot-check after SCR decision).

---

*Keep steps outcome-based (observable UI). Extend when adding workflows.*
