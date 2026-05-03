# OptiCore — Defense Q&A (Panel-Style)

Short answers you can practice aloud. Wording matches the **current** system (Next.js 15, TypeScript, Supabase, `ScheduleEntry`, RLS, INS + Evaluator).

---

## General & system overview

### 1. Give a 2-minute overview: Chairman opens the system until the schedule is published.

**Answer:** The Program Chairman signs in and opens the **Evaluator** to plot classes (subject, section, room, time, instructor) for their college/program scope. Each **Save** writes rows to **`ScheduleEntry`** in Postgres. **INS Forms** (Faculty / Section / Room) read the same rows for official-style grids and printing. **GEC** and **College Admin** work in parallel where their roles allow (e.g. vacant GEC slots after per-college access approval). When **DOI / VPAA** **publishes** the term, rows can be **locked**; chairs/colleges stop editing live slots, but everyone still **reads** the published timetable. Instructors use **Campus Intelligence**, **My schedule** (full INS Faculty form), and **INS Form** tabs; students see their section schedule. Updates propagate via **Supabase Realtime**, debounced reloads, and in-app refresh signals—not a second copy of the truth.

### 2. What is the single most important feature and why?

**Answer:** **One central timetable in `ScheduleEntry`** shared by Evaluator, INS, faculty portal, DOI, and students. One source of truth avoids conflicting spreadsheets and keeps policy, load, and printouts aligned.

### 3. How do you avoid double-booking an instructor across colleges (e.g. COTE teaching in CAS)?

**Answer:** **Conflict checks** build time blocks from **`ScheduleEntry`** rows the client has loaded for the term and scan **instructor, room, and section** overlaps. If the same person has two classes at the same time in rows you can see (including cross-program / cross-college rows your **RLS** allows), the tool flags it. **Who sees which rows** is controlled by **RLS** (e.g. DOI campus-wide, college/chairman by college, instructor own rows plus college-scope reads where policy allows). It is not a separate “magic” database—visibility plus the same overlap rules drive consistency.

### 4. When a schedule is saved in the Evaluator, where does data go and who sees it immediately?

**Answer:** Data is written to **`ScheduleEntry`** (and related tables when policy applies, e.g. load justifications). Anyone authorized to **SELECT** those rows for that term sees updates via **Realtime** on `ScheduleEntry`, **debounced refetch**, and **broadcast-style reload** in the INS catalog—often without a full manual refresh, subject to network and Supabase config.

### 5. Evaluator vs INS Forms — why both?

**Answer:** **Evaluator** = **authoring** (plot, move, policy, overload justification, conflict tools). **INS** = **official presentation** (Forms 5A/5B/5C layout, signatures, print/PDF) built from the **same** `ScheduleEntry` data so paper and screen match without maintaining two business models.

---

## Core architecture & workflow

### 6. Core architecture? Why Next.js 15 + Supabase instead of Laravel or .NET?

**Answer:** **Next.js 15** (App Router, React Server Components where useful) + **TypeScript** + **Tailwind** for one cohesive web app. **Supabase** gives **Postgres**, **Auth**, **Realtime**, and **Storage** with **Row Level Security** at the database. The team chose a **JavaScript/TypeScript** stack end-to-end and **RLS-first** security; Laravel/.NET are valid alternatives but are not what this codebase uses.

### 7. Centralized repository — role of `ScheduleEntry` and “real-time” across roles.

**Answer:** **`ScheduleEntry`** is the row-level timetable: term, section, subject, room, day, start/end, instructor. **Realtime** subscriptions and **lightweight polling** refresh grids; **events** coalesce saves so INS and Evaluator stay in sync for the same `academicPeriodId`.

### 8. End-to-end scheduling workflow (step-by-step).

**Answer:** (1) Catalog: periods, programs, sections, subjects, rooms, users. (2) Chairman/college **plots** in Evaluator → **Save** → `ScheduleEntry`. (3) **Policy / justification** when load rules require it → stored for DOI/college review. (4) **GEC** vacant staffing where applicable, with **per-college access** where implemented. (5) **DOI publication** locks the term for edits. (6) **INS** + portals **read** published (or draft) rows; instructors may **request schedule changes** through workflow, not by editing `ScheduleEntry` directly.

### 9. Login — admins vs instructors vs students; impersonation / duplicate IDs.

**Answer:** **Supabase Auth** backs sign-in; app **`User`** rows carry **`role`** (`chairman_admin`, `college_admin`, `cas_admin`, `gec_chairman`, `doi_admin`, `instructor`, `student`, `visitor`). **Middleware** and **`requireRoles`** gate routes. Staff are typically **provisioned** by admins; **students** follow the app’s registration flow. **Employee ID** (and related profile fields) support linking faculty to schedules and display rules; uniqueness is enforced in the **database and app validation**—cite your exact constraint names in defense if asked.

### 10. How do you prevent duplicate accounts or impersonation (Employee ID / Student ID)?

**Answer:** **Supabase Auth** owns the login identity; each person maps to an app **`User`** row with a fixed **role** and **college**. **Employee ID** on faculty (and student identifiers on students) ties schedules and profiles to the correct **`User.id`**. Duplicates and spoofing are reduced by **DB uniqueness where defined**, **admin-provisioned staff accounts**, **RLS** so users only read rows in policy, and **not** exposing raw IDs as the primary UI label where policy prefers names.

### 11. Evaluator internals — conflict algorithm? Optimization?

**Answer:** **Deterministic overlap detection** on sparse blocks (instructor / room / section in the same window). **Suggestions** may use a **small rule-based / GA-style helper** for alternative slots in some flows—not a full campus-wide **timetabling optimizer**. Human chairs retain control; automation assists, not replaces.

### 12. GEC Chairman — one-time approval and limits.

**Answer:** GEC users **request access per college**; **College Admin** approves for that college. After approval, **vacant GEC**-style edits are allowed where policy allows; **major / non-vacant** behavior follows your seeded rules and RLS. Limitation: scope is **per college approval**, not automatic access to every college.

### 13. Policy justification — when, where stored, DOI review.

**Answer:** When save/assign would **violate faculty load policy** (evaluator-side checks), a **modal** collects text; data goes to **`ScheduleLoadJustification`** (and snapshots) for **DOI/VPAA** (and college views where wired) to **approve/reject** with audit trail.

### 14. Cross-college instructor assignment and campus-wide load.

**Answer:** An instructor can appear on rows whose **sections** belong to different programs/colleges depending on assignment data. **Load** is computed from **their `ScheduleEntry` rows** for the term (and aligned with **INS Form 5A** using the same row set / `ignoreProgramScope` style rules so hours match the faculty portal).

### 15. Printing INS — signature lines; who edits signatories?

**Answer:** Print uses the **INS document components** and print CSS. **Signature slots** come from **`buildInsSignatureSlots`**, merged with optional **`College.insSignerDisplay`** and **`CampusInsSettings.insSignerDisplay`**. **College Admin** and **DOI** editors in-app adjust those labels; **instructors** do not edit signatory names on the official strip.

### 16. Campus Navigation — integrated with schedule?

**Answer:** **Standalone** wayfinding module (`/campus-navigation`), linked from shells. It does **not** drive or replace the timetable grid.

---

## Data consistency & technical

### 17. Chairman saves → immediately on INS for Instructor, GEC, College Admin, DOI?

**Answer:** Same **`ScheduleEntry`** table; clients **subscribe** to changes and **reload** scoped rows. If Realtime is misconfigured, **polling** and **manual refresh** still converge; production should include **`ScheduleEntry`** in the Realtime publication.

### 18. Disconnect / shutdown while plotting — auto-save?

**Answer:** The **evaluator worksheet** uses **debounced autosave** while online, with logic to **defer when offline** and flush when back—still recommend explicit **Save** before closing the laptop for critical sessions.

### 19. RBAC vs RLS.

**Answer:** **RBAC** in the app: roles and route access. **RLS** in Postgres: **which rows** each role can `SELECT`/`INSERT`/`UPDATE`/`DELETE` on `ScheduleEntry`, `StudentProfile`, etc. A recent fix avoids **policy recursion** between `ScheduleEntry` and `StudentProfile` (student-only student policy + **SECURITY DEFINER** helper for instructor roster reads)—apply migration **`20260502180000_fix_scheduleentry_studentprofile_rls_recursion.sql`** on hosted DBs.

### 20. Profile picture upload limit?

**Answer:** **10 MB** on the **`signatures`** storage bucket (migration), with **client-side checks**; avatar/signature URLs stored on **`User`** / profile as designed.

### 21. Conflict detection — campus-wide or scoped? Example of faculty double-book across colleges.

**Answer:** The scan runs on the **`ScheduleEntry` rows loaded for that client/session** (RLS-bound). **Example:** two rows, **same `instructorId`**, **same day**, **overlapping `startTime`/`endTime`** (e.g. 9:00–10:00 in one section and 9:30–10:30 in another)—the tool reports an **instructor double-book** if both rows appear in that scan (e.g. DOI campus-wide, or any view that includes both colleges’ rows for that instructor).

**Related (hours/week mismatch, e.g. “Gwyneth Alberca”):** totals diverged when **INS 5A** used a **narrower program slice** while **My Schedule** summed **all** of the instructor’s rows for the term. **Fix:** use the **same row set** for Form 5A as for the portal (**college-wide instructor rows** + **`ignoreProgramScope`** in the live INS hook) so hours match.

---

## Evaluation, limitations & future work

### 22. How was the system evaluated? ISO 9126, SUS, key findings?

**Answer:** The codebase does **not** include a formal **ISO 9126** or **SUS** study by default. Describe what you **did**: **functional/regression testing** (see **`docs/TESTING_CHECKLIST_OPTICORE.md`**), **role-based walkthroughs** (chair → college → DOI → instructor), **pilot feedback**, and **bug counts / severity**. If you ran a survey, state **n** and **one headline result** only if real.

### 23. What are the main limitations of the current system?

**Answer:** No **full auto-timetabling**; **offline** support is partial; **correctness depends on RLS + migrations** being applied on each environment; **Realtime** must include `ScheduleEntry` for the best live experience; **edge cases** (cross-college adjunct, partial data) need clear policy and testing.

### 24. Why is scheduling not fully automated with a genetic algorithm (or similar)?

**Answer:** The product prioritizes **human judgment** (chairs, load policy, room reality) with **deterministic conflict checks** and **small suggestion helpers**. A real **GA / MIP** campus solver needs a complete formal model of constraints and preferences—out of scope for this version.

### 25. What are your top 3 recommended future improvements?

**Answer:** (1) **Stronger offline / sync** for long evaluator sessions. (2) **Richer optimization or suggestions** once constraints are fully formalized. (3) **Analytics and reporting** (utilization, load equity) on the existing **`ScheduleEntry`** warehouse.

---

## Quick one-liners (warm-up)

- **Overview (30 s):** “Chairman plots in Evaluator → `ScheduleEntry` → INS and portals read the same rows → DOI publishes and locks → instructors request changes through workflow.”
- **Conflicts:** “Overlap scan on loaded `ScheduleEntry` blocks—instructor, room, section.”
- **GEC:** “Per-college access approval, then vacant-slot workflows within policy.”
- **Justification:** “Overload modal → `ScheduleLoadJustification` → DOI/college review.”

---

*Maintainers: trim or expand answers to match your thesis wording and any numbers you measured in user studies.*
