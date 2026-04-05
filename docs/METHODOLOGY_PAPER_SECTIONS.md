# OptiCore — Methodology & Methods (Draft for Thesis Chapter)

*The following sections are written in **future tense**, in an academic register, for inclusion where the original chapter structure is preserved. Adapt numbering to your institution’s template.*

---

## 3.3 Research Instruments

The investigation will employ a **fully functional web-based information system** as the primary research artifact. The **OptiCore: Campus Intelligence System** prototype will serve as both the intervention and the instrument through which scheduling workflows, policy visibility, and multi-role coordination will be observed. Data collection instruments will include:

- **Structured system logs and audit trails** exported from the platform’s audit facility, which will record actor identifiers, actions, entity types, and timestamps.
- **Electronic survey instruments** (to be administered to administrators and faculty after stabilization of the prototype) that will measure perceived usability, trust in schedule accuracy, and clarity of workflow responsibilities.
- **Semi-structured interview guides** for key informants (College Administrator, Program Chair, GEC coordinator, and DOI representative) to capture qualitative insights on alignment with institutional policy and on barriers to adoption.
- **Observation checklists** aligned with use cases (e.g., evaluator plotting, inbox forwarding, vacant-slot approval, DOI final approval) to verify that each role’s constraints—particularly **GEC vacant-slot governance** and **DOI final sign-off**—are reflected in actual use.

The digital platform itself will therefore constitute a **composite instrument**: it will operationalize the concepts under study while generating **traceable behavioral data** through normal use.

---

## 3.4 Data Gathering Procedure

Data will be gathered in **phases** to protect validity and to respect institutional ethics clearance.

1. **Baseline and context phase.** Program documents (curriculum maps, room inventories, and policy memos) will be collected and encoded into the system’s reference catalogs (programs, sections, subjects, rooms).
2. **Prototype deployment phase.** Authorized users will perform realistic scheduling tasks in a controlled environment (staging or pilot semester). The system will **persist** schedule rows, notifications, workflow messages, and access-request records subject to row-level security.
3. **Transaction log extraction.** College-scoped and role-scoped queries will export **AuditLog** entries and schedule snapshots for analysis. Personal identifiers will be **pseudonymized** in research datasets where ethics protocols require it.
4. **Instrument administration phase.** Surveys and interviews will be conducted **after** users have completed at least one full cycle: draft plotting → college review → GEC vacant-slot handling (where applicable) → DOI approval.
5. **Triangulation.** Quantitative metrics (e.g., conflict counts, time-to-approval) will be interpreted alongside qualitative themes from interviews and open-ended survey items.

All electronic data will be stored in **encrypted Supabase** project storage; access tokens will be rotated according to institutional IT policy.

---

## 3.5 Statistical Treatment / Treatment of Data

Quantitative indicators derived from the system will be summarized using **descriptive statistics** appropriate to small administrative populations: measures of central tendency and dispersion for continuous variables (e.g., time between draft and approval), and **frequency distributions** for categorical outcomes (e.g., conflict types, approval statuses).

Where sample sizes permit, **paired comparisons** (e.g., pre- and post-intervention scheduling effort scores from surveys) will be analyzed using **non-parametric tests** (Wilcoxon signed-rank or Mann–Whitney U) because distributional assumptions may not hold in small-N administrative samples. Effect sizes will be reported alongside *p*-values.

Qualitative interview transcripts will be analyzed using **thematic analysis** with coder agreement checks. System-generated logs will be used to **corroborate** self-reported behaviors.

Missing data will be reported transparently; no imputation will be applied to audit extracts unless explicitly justified.

---

## SYSTEM METHODOLOGY

### 4.1 External Interface Requirements

The system will expose **browser-based** interfaces only: **Next.js 15** pages rendered to HTML with **Tailwind CSS** styling. External actors will interact through:

- **HTTPS** to the hosted Next.js application.
- **Supabase Auth** for identity (email/password or institutional provider, as configured).
- **Supabase REST and Realtime** endpoints for `ScheduleEntry`, `Notification`, and workflow tables.

No native mobile application is required initially; interfaces will be **responsive** so that phones and tablets remain usable for monitoring and light approvals.

### 4.2 User Interface Requirements

The user interface will maintain a **consistent design system**: crimson gradient header, orange accent navigation, neutral gray workspace, and accessible contrast. **CampusIntelligenceShell** will provide a unified layout for Chairman, College, CAS, GEC, and DOI roles; **PortalShell** will serve faculty and students. **Profile** settings will be reachable from the **avatar menu** (not duplicated in the sidebar) to reduce clutter.

### 4.3 Software Requirements

- **Client:** React 18, TypeScript, Tailwind CSS 4.
- **Server:** Next.js App Router, server components where appropriate, API routes for inbox and audit.
- **Database:** PostgreSQL (Supabase) with **Row Level Security** enforcing college and program scope.
- **Charts:** Recharts for dashboard analytics.

### 4.4 Hardware Requirements

End users will require **modern web browsers** (current Chrome, Edge, Firefox, Safari) and **network bandwidth** sufficient for JSON APIs and optional realtime subscriptions. Server-side infrastructure will match Supabase and Vercel (or equivalent) hosting tiers chosen for the pilot.

### 4.5 Communication Interfaces

Communication will occur over **TLS 1.2+**. The browser client will use the **Supabase JS SDK** with the public anon key; service-role operations will remain server-side only. **Realtime channels** will subscribe to `ScheduleEntry` and workflow tables where enabled.

### 4.6 Scheduling Module Requirements

The scheduling module will support **academic periods**, **sections**, **subjects**, **rooms**, and **instructors**, combined into **`ScheduleEntry`** rows with day and time. **Conflict detection** will execute client-side for responsiveness, with optional server-side validation policies as RLS permits.

### 4.7 Reporting Module Requirements

Dashboards will display **aggregated** statistics (sections, instructors, utilization placeholders) and **recent activity** fed by audit APIs. Export to print/PDF will rely on **browser print** styles for INS forms.

### 4.8 Security Requirements

Authentication will bind **`User.id`** to **`auth.users.id`**. RLS policies will restrict **Chairman** to assigned college/program, **College Admin** to college peers, **GEC** and **CAS** to documented scopes, and **DOI** to campus-wide read where implemented. **AccessRequest** records will govern temporary elevation (e.g., vacant-slot editing).

### 4.9 Data Management Requirements

Migrations will be versioned in **`supabase/migrations`**. Backups will follow Supabase project settings. Personally identifiable fields (email, names) will be minimized in logs; audit entries will reference **actor IDs**.

### 4.10 Workflow Requirements

Workflow will be supported through **`WorkflowInboxMessage`** and REST **inbox** routes, enabling **chairman → college → CAS → GEC → DOI** progression. **GEC Chairman** actions on **vacant slots** will remain contingent on **College Admin approval** when institutional rules require it.

### 4.11 Schedule Feasibility

Schedule feasibility will be assessed through **automated conflict scanning** (instructor, room, section overlap) and **manual DOI review**. **Load-policy** checks will flag over-capacity teaching assignments. A schedule will be considered **feasible for publication** only when **conflicts are resolved**, **justifications** (if any) are recorded in **`ScheduleLoadJustification`**, and **DOI** has completed **final approval** with accompanying **notifications** to stakeholders.

---

## Suggested figures for the written thesis (screenshots)

Capture **read-only** or **sanitized** data.

1. **Login** — `/login` (branding, role-based redirect).
2. **Campus Intelligence dashboard** — `/admin/college` or `/chairman/dashboard` (metric cards + charts).
3. **Mobile navigation** — same shell with **sidebar drawer** open (phone width).
4. **Evaluator** — plotting panel + **schedule overview table** (show horizontal scroll hint on narrow view).
5. **INS Form** — faculty view with live term banner.
6. **Inbox** — mail list + message preview (workflow context).
7. **GEC vacant slots** — `/admin/gec/vacant-slots` (if populated).
8. **Access requests** — College Admin approval screen.
9. **Profile** — opened from **avatar** dropdown (demonstrates sidebar rule).
10. **Notifications** — bell dropdown with sample notification.

---

## Updated database schema (consolidated reference)

```sql
-- Core reference data
AcademicPeriod (id, name, semester, academicYear, isCurrent, startDate, endDate)
College (id, code, name)
Program (id, code, name, collegeId → College)
Section (id, programId, name, yearLevel, studentCount)
Room (id, code, building, floor, capacity, type, collegeId)
Subject (id, code [unique], subcode, title, lecUnits, lecHours, labUnits, labHours, programId, yearLevel)

-- People
User (id [PK = auth uid], employeeId [unique], email [unique], name, role, collegeId, chairmanProgramId, createdAt, updatedAt)
FacultyProfile (id, userId [unique → User], fullName, degrees, majors, minors, status, designation, ratePerHour, …)
StudentProfile (id, userId [unique], programId, sectionId, yearLevel, createdAt, updatedAt)

-- Scheduling
ScheduleEntry (id, academicPeriodId, subjectId, instructorId, sectionId, roomId, day, startTime, endTime, status)
ScheduleLoadJustification (id, academicPeriodId, collegeId, authorUserId, authorName, authorEmail, justification, violationsSnapshot, createdAt, updatedAt)

-- Workflow & governance
Notification (id, userId, message, isRead, createdAt)
WorkflowInboxMessage (id, senderId, collegeId, fromLabel, toLabel, subject, body, workflowStage, mailFor[], sentFor[], status, createdAt)
AccessRequest (id, requesterId, collegeId, status, scopes[], note, reviewedById, reviewedAt, expiresAt, createdAt, updatedAt)
AuditLog (id, actorId, collegeId, action, entityType, entityId, details jsonb, createdAt)
```

*Apply all migrations in `supabase/migrations/` for indexes, RLS, and triggers (e.g., `updatedAt`).*

---

## Class diagram (textual description)

**Boundary:** The **OptiCore Application** orchestrates browser pages and API routes.

**Core entities (domain model):**
- **`College`** aggregates **`Program`**, which aggregates **`Section`**. **`Subject`** belongs to **`Program`**.
- **`User`** associates with **`College`** (and optionally **`Program`** via `chairmanProgramId`). **`FacultyProfile`** composes 1:1 with **`User`** for instructors.
- **`ScheduleEntry`** links **`AcademicPeriod`**, **`Subject`**, **`User`** (instructor), **`Section`**, and **`Room`**.
- **`Notification`** associates to **`User`** (recipient).
- **`WorkflowInboxMessage`** supports cross-role mail with **`College`** scope arrays (`mailFor`, `sentFor`).
- **`AccessRequest`** connects **`User`** (requester) to **`College`** with approval metadata.
- **`AuditLog`** records **`User`** actions on entities for accountability.
- **`ScheduleLoadJustification`** stores policy exceptions for a term and college.

**Relationships:** Many `ScheduleEntry` rows per `AcademicPeriod`; `Subject.code` globally unique; `FacultyProfile` enforces one profile row per `User`.

**Behavioral note:** **RLS policies** on the database realize association rules so that the object diagram above is **enforced at runtime**, not only in application code.

---

*End of draft sections.*
