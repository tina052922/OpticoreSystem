# OptiCore system flow — CTU Argao

OptiCore is a campus intelligence system for academic scheduling and room navigation. The **Next.js frontend** (`opticore-web`) never writes schedules directly; the **Express backend** (`opticore-backend`) owns auth, catalog writes, notifications, and RLS-backed data access.

Storage still uses `programMode: "night"` for the evening offering. **Every user-facing label is Evening Program**, never “Night Program.” Day and Evening stay separate datasets (plotting, conflicts, teaching load, INS).

---

## Roles

| Role | Scope | Main work |
|---|---|---|
| Instructor | Own load | Register (email + Employee ID → Faculty Profile), view schedule, request schedule change |
| Program Chairman | One program | Plot majors, notify College Admin when plotted, approve/reject schedule changes |
| College Admin | Own college | College-wide Evaluator, campus-wide conflict check, Summary of Teaching Load (by department + PDF), Access requests, notify GEC ready |
| GEC Chairman | Vacant GEC only | Request access per college, plot vacant GEC slots after approval |
| DOI / VPAA | Campus | Policy justifications, final publish/lock |
| Student | Own section | Section schedule, campus navigation |
| CAS Admin | Campus hub | Central Hub / INS (view and CAS tools) |

---

## A. Scheduling flow (start to finish)

```
1. Instructor registers (self-registration + Employee ID linked to Faculty Profile)
        ↓
2. Program Chairman plots major/program schedules in Evaluator
   • Day Program and Evening Program are separate
   • Prep ≥ 4 distinct subjects → written justification
     → notifies College Admin + DOI
     → text appears on Summary of Teaching Load
        ↓
3. Chairman clicks “Notify College Admin: program plotted”
        ↓
4. College Admin double-checks college schedules
   • Evaluator week-grid (all departments/sections in the college)
   • Campus-wide conflict check
   • Central Hub college tiles (peer colleges view-only)
   • Summary of Teaching Load by category + PDF
        ↓
5. College Admin notifies GEC (entire college or one department)
        ↓
6. GEC Chairman requests approval to plot vacant GEC slots for that college
   • College Admin is notified
        ↓
7. College Admin Approve or Reject
   • GEC is notified (approved → they can plot; rejected → they cannot)
        ↓
8. GEC plots vacant GEC schedules only
   • College Admin + Program Chairmen of that college + DOI are notified
        ↓
9. DOI does final campus-wide check
   • Approve → publish/lock all ScheduleEntry rows for the term
   • Instructors, chairs, college admins, GEC, CAS, students are notified
   • Evaluator / INS become read-only for that term
        ↓
10. Instructors and students view published schedules
    • Faculty INS / My schedule
    • Student section schedule
    • Campus navigation
```

---

## B. Role rules (plotting)

- **Chairman:** program-scope plot only (`chairmanProgramId`).
- **College Admin:** college-wide plot; cannot write peer-college rows even after hub access; conflict check is campus-wide.
- **GEC:** vacant GEC cells only, and only after an approved `AccessRequest` (`gec_vacant_slots`) for that college.
- **DOI:** final review / approve / lock. Publication sets `lockedByDoiAt` and `status: "final"`.

---

## C. Schedule change (after plots exist)

```
Instructor opens cell grid (12-hour labels, unavailable cells flagged, room availability)
        → submits change request
        → Program Chairman (not College Admin) runs conflict check
        → Approve: schedule updates, INS/hubs refresh, instructor notified
        → Reject: instructor notified; schedule unchanged
```

---

## D. Summary of Teaching Load

- College Admin route: `/admin/college/teaching-load-summary`
- Grouped by department: BSIT, BSIE, BIT – Drafting, BIT – Garments, BIT – Electronics, BIT – Automotive, then other programs in that college
- Columns: faculty name, designation, other responsibilities, Day preps/units/hours, Evening preps/units/hours, subjects handled, justification, totals
- Day and Evening never merged
- Numbers from live plotted `ScheduleEntry` rows
- PDF preview/download (landscape)
- Loads once per term (or on Refresh / filter change) — does not stay on “Loading summary…”

---

## E. Curriculum (prospectus vs catalog)

- **BSIT** and **BSENVS** use static CMO prospectus files in the frontend registry.
- **BIT / BSIE** (and any other program without a static file) use **catalog `Subject` rows** for the Evaluator subject list and Summary of Subjects. They do **not** inherit the BSIT prospectus.
- Official CMO files can be added later under `lib/chairman/` and registered in `prospectus-registry.ts` without changing the plot API.

---

## F. Notifications (Express only)

| Event | Recipients |
|---|---|
| Prep/hour justification submitted | College Admin of that college + DOI |
| Chairman: program plotted | College Admin of that college |
| College Admin: ready for GEC (college or department) | All GEC Chairmen |
| GEC creates access request | College Admin of the target college |
| Access request approved / rejected | GEC requester |
| GEC saves vacant GEC plots | College Admin + Chairmen of that college + DOI |
| DOI publishes the term | Instructors on the term, chairs, college admins, GEC, CAS, students in those sections |

There are no Next.js notification-create routes.

---

## G. Central Hub

- College Admin Evaluator default = Chairman-style week grid. **College hub** = `?hub=1` (college tiles, overview, peer view).
- CAS / DOI / GEC keep campus-wide Central Hub.
- Peer-college hubs stay view-only after access approval.

---

## H. Student and campus navigation

Students view their section timetable (`/student/schedule`) after DOI publish. Campus navigation is available to all signed-in roles that have it in the shell.

---

## I. Security layers

1. Supabase Auth session (`oc_at` cookie or Bearer token)
2. Express `verifySupabaseToken` + `requireRole`
3. College / program scope checks in controllers (e.g. College Admin cannot write peer colleges)
4. Supabase RLS on tables
5. Frontend is a client of the API, not a second write path
