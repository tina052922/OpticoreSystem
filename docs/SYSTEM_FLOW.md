# OptiCore system flow — CTU Argao

OptiCore is a campus intelligence system for academic scheduling and room navigation. The **Next.js frontend** (`opticore-web`) never writes schedules directly; the **Express backend** (`opticore-backend`) owns auth, catalog writes, notifications, and RLS-backed data access.

Storage still uses `programMode: "night"` for the evening offering. **Every user-facing label is Evening Program**, never “Night Program.” Day and Evening stay separate datasets (plotting, conflicts, teaching load, INS).

---

## Official presentation spine

**Register → Chairman validates instructor → Chairman plot → College check/plot → Notify GEC → GEC access → GEC plot → DOI approve → Publish**

```
1. Instructor registers
   • Email, password/temp password, employee ID, college, home department, faculty profile
   • Account stays pending (not full Instructor access)
   • Employee ID is linked to Faculty Profile
        ↓
2. Program Chairman is notified and opens Instructor registrations
   • Approve → instructor becomes active in User + Faculty Profile; instructor is notified; can sign in and be assigned when plotting
   • Reject → instructor is notified; no instructor login or plotting assignment
        ↓
3. Program Chairman plots program schedules (Evaluator)
   • Day Program and Evening Program are separate
   • Campus-wide conflict check
   • Prep ≥ 4 distinct subjects → written justification (College Admin + DOI notified; text on Summary of Teaching Load)
   • Optional: Notify College Admin that the program is plotted
        ↓
4. College Admin reviews / may plot college-wide
   • Evaluator UI is the same week-grid as Chairman
   • Campus-wide conflict check
   • Summary of Teaching Load (department tabs + PDF)
        ↓
5. College Admin: Notify GEC ready for plotting
   • From Evaluator / Central Hub Evaluator only (not from Summary of Teaching Load)
   • Entire college or one department
        ↓
6. GEC Chairman requests access → College Admin Approve / Reject → GEC notified
        ↓
7. GEC plots vacant GEC slots only
   • College Admin + Program Chairmen of that college + DOI are notified
        ↓
8. DOI final campus-wide check → Approve / Publish / Lock
   • Instructors, chairs, college admins, GEC, CAS, students are notified
   • Evaluator / INS become read-only for that term
        ↓
9. Published schedules visible to instructors and students
```

### Side quest — Schedule change (not the main demo spine)

```
Instructor clicks own class (My Schedule / Faculty INS)
        → cell grid (12-hour labels; unavailable flagged; room availability)
        → submit
        → Program Chairman (not College Admin) conflict check
        → Approve: schedule updates; INS/hubs reflect; instructor notified
        → Reject: instructor notified; schedule unchanged
```

---

## Roles

| Role | Scope | Main work |
|---|---|---|
| Instructor | Own load | Register (pending until chairman approval); after approval: view schedule, request schedule change |
| Program Chairman | One program | Approve/reject instructor registrations; plot majors; notify College Admin when plotted; approve/reject schedule changes |
| College Admin | Own college | College-wide Evaluator; campus-wide conflict check; Summary of Teaching Load (category + PDF); GEC access approve; notify GEC ready (Evaluator / Central Hub only) |
| GEC Chairman | Vacant GEC only | Request access per college; plot vacant GEC slots after approval |
| DOI / VPAA | Campus | Policy justifications; final publish/lock; System Configuration |
| Student | Own section | Section schedule, campus navigation |
| CAS Admin | Campus hub | Central Hub / INS (view and CAS tools) |

---

## Plotting rules

- **Chairman:** program-scope plot only (`chairmanProgramId`).
- **College Admin:** college-wide plot; cannot write peer-college rows even after hub access; conflict check is campus-wide.
- **GEC:** vacant GEC cells only, and only after an approved `AccessRequest` (`gec_vacant_slots`) for that college.
- **DOI:** final review / approve / lock. Publication sets `lockedByDoiAt` and `status: "final"`.
- Pending or rejected instructor accounts cannot be assigned on new plots.

---

## Summary of Teaching Load

- College Admin route: `/admin/college/teaching-load-summary`
- Simple INS-style grid (no Refresh, no GEC notify on this page)
- Load once on open or when the academic term changes; switching browser tabs does not re-show “Loading summary…”
- Categories: BSIT, BSIE, BIT – Drafting, BIT – Garments, BIT – Electronics, BIT – Automotive, then other programs
- Columns: No., Name, Designation, Day Preps, Day Hrs/Wk, Eve Preps, Eve Hrs/Wk, Subjects Handled, Justification
- Day and Evening never merged; numbers from live plotted `ScheduleEntry` rows
- PDF download (landscape) with Prepared by / Noted by / Recommending Approval / Approved by lines

---

## Curriculum (prospectus vs catalog)

- **BSIT** and **BSENVS** use static CMO prospectus files in the frontend registry.
- **BIT / BSIE** (and any other program without a static file) use **catalog `Subject` rows**. They do **not** inherit the BSIT prospectus.
- Official CMO files can be added later under `lib/chairman/` and registered in `prospectus-registry.ts` without changing the plot API.

---

## Notifications (Express only)

| Event | Recipients |
|---|---|
| Instructor self-registration submitted | Program Chairman of that department (college chairmen if no department) |
| Instructor registration approved / rejected | That instructor |
| Prep/hour justification submitted | College Admin of that college + DOI |
| Chairman: program plotted | College Admin of that college |
| College Admin: ready for GEC (college or department) | All GEC Chairmen |
| GEC creates access request | College Admin of the target college |
| Access request approved / rejected | GEC requester |
| GEC saves vacant GEC plots | College Admin + Chairmen of that college + DOI |
| DOI publishes the term | Instructors on the term, chairs, college admins, GEC, CAS, students in those sections |

There are no Next.js notification-create routes.

---

## Central Hub

- College Admin Evaluator default = Chairman-style week grid. **College hub** = `?hub=1` (college tiles, overview, peer view).
- CAS / DOI / GEC keep campus-wide Central Hub.
- Peer-college hubs stay view-only after access approval.
- Notify GEC lives on Evaluator and Central Hub Evaluator, not on Summary of Teaching Load.

---

## Student and campus navigation

Students view their section timetable (`/student/schedule`) after DOI publish. Campus navigation is available to all signed-in roles that have it in the shell.

---

## Security layers

1. Supabase Auth session (`oc_at` cookie or Bearer token)
2. Express `verifySupabaseToken` + `requireRole`
3. Instructor validation gate (`User.instructorValidation`: pending / active / rejected). Existing rows default to **active**.
4. College / program scope checks in controllers
5. Supabase RLS on tables
6. Frontend is a client of the API, not a second write path

Apply `opticore-backend/migrations/004_instructor_validation.sql` on the database before deploying the instructor-approval flow.
