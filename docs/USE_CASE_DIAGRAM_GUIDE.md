# OptiCore — Text-Based Use Case Diagram Guide

This guide supports drawing a UML use case diagram for **OptiCore: Campus Intelligence System – CTU Argao**. Actors are kept minimal; relationships use UML stereotypes **«include»** (mandatory sub-behavior) and **«extend»** (optional/conditional extension).

---

## Actors (minimal set)

| Actor | Description |
|--------|-------------|
| **Chairman Admin** | Program-scoped chair; plots schedules, INS views, forwards workflow mail. |
| **College Admin** | College-scoped; reviews drafts, access requests, audit; may view campus-wide read-only data. |
| **CAS Admin** | Receives college forwards; coordinates GEC distribution. |
| **GEC Chairman** | Uses the **same Campus Intelligence shell** as other admins (dashboard, centralized evaluator view, centralized schedule view). May **only** create or edit work related to **GEC subjects** for programs that offer those subjects, and **only** on **vacant slots** that correspond to GEC offerings. **Editing vacant slots** requires submitting an **approval request** to the **College Admin** of the college that owns the program. |
| **DOI Admin** | Same UI and most workflows as College Admin, plus **final institutional review**: policy checks, justification requests to Chairman when needed, **digital approval/signature**, **notifications** to admins, chairmen, and instructors when the schedule is officially published. |
| **Instructor** | Views own schedule, notifications; may use faculty portal features. |
| **Student** | Views own schedule and announcements (read-heavy). |
| **System (OptiCore + Supabase)** | External system boundary for persistence, auth, realtime, and notifications. |

*Optional secondary actors (only if the diagram allows): **Database / Supabase** as a subsystem boundary inside «System».*

---

## Primary use cases (by actor)

### Chairman Admin
- **UC-C01 Authenticate** — Sign in via Supabase Auth; session drives RLS scope.
- **UC-C02 Manage program schedule (Evaluator)** — Plot `ScheduleEntry` rows for sections/subjects/rooms in assigned program.
- **UC-C03 View INS forms** — Faculty / section / room schedule views from live data.
- **UC-C04 Run conflict checks** — Client-side conflict scan on scoped entries.
- **UC-C05 Forward draft to College Admin** — Inbox / workflow message.
- **UC-C06 Manage subject codes & faculty profile** — CRUD within RLS.

### College Admin
- **UC-A01 Authenticate** — College-scoped session.
- **UC-A02 Review inbox & workflow** — Mail/sent; persisted `WorkflowInboxMessage` where applicable.
- **UC-A03 View centralized evaluator & schedules (read)** — Cross-college **view** where policy allows; **editing** another college’s vacant slots is not direct—use **access / approval** paths.
- **UC-A04 Approve access requests** — GEC/CAS requests for evaluator, INS, vacant-slot scopes.
- **UC-A05 Approve vacant-slot edit requests** — **«include»** when GEC Chairman or another role requests approval to modify vacant slots in the college’s scope.
- **UC-A06 Audit log** — Review `AuditLog` entries.

### CAS Admin
- **UC-S01 Authenticate**
- **UC-S02 Distribute GEC workload** — Forward portions to GEC Chairman / DOI per workflow.
- **UC-S03 View centralized hub** — Read evaluator/schedule context for coordination.

### GEC Chairman
- **UC-G01 Authenticate**
- **UC-G02 View centralized evaluator & schedule (same UI as other admins)** — Read-only insight into hub data.
- **UC-G03 Work on GEC subjects only** — All plot or slot actions are constrained to **GEC subject offerings** tied to eligible programs.
- **UC-G04 Propose edits to vacant GEC slots** — **«extend»** **UC-A05** (requires College Admin approval for the owning college).
- **UC-G05 Request temporary access** — **«extend»** **UC-A04** when broader scopes are needed.

### DOI Admin
- **UC-D01 Authenticate**
- **UC-D02 Review finalized, conflict-free schedules** — After college/CAS workflow.
- **UC-D03 Policy & compliance review** — Check against institutional rules.
- **UC-D04 Request justification from Chairman** — **«extend»** when anomalies exist.
- **UC-D05 Approve & digitally sign** — Final approval record.
- **UC-D06 Notify stakeholders** — Admins, chairmen, instructors via `Notification` / inbox.

### Instructor / Student
- **UC-I01 View assigned schedule / notifications**
- **UC-ST01 View own section schedule and announcements**

---

## «include» relationships (examples)

| Base use case | «include» | Meaning |
|---------------|-----------|---------|
| **UC-C02 Manage program schedule** | **Validate conflicts** | Conflict detection is part of responsible plotting. |
| **UC-C05 Forward draft** | **Persist workflow message** | Forwarding writes/reads workflow inbox data where enabled. |
| **UC-G04 Propose vacant-slot edits** | **Submit approval to College Admin** | Cannot complete slot change without approval path. |
| **UC-D05 Approve & sign** | **UC-D06 Notify stakeholders** | Publication implies notification (or include a subprocess “Record approval” then notify). |

## «extend» relationships (examples)

| Extension | Extends | Condition |
|-----------|---------|-----------|
| **UC-D04 Request justification** | **UC-D03 Policy review** | Only if violations or load anomalies are detected. |
| **UC-G05 Request temporary access** | **UC-G03 Work on GEC subjects** | When scoped access is insufficient. |
| **UC-A03 View centralized data** | **(read-only branch)** | College Admin may extend to “export/report” if implemented. |

---

## Which UI each actor sees

| Actor | Shell / route prefix | Notes |
|-------|----------------------|--------|
| Chairman Admin | `/chairman/*` — **CampusIntelligenceShell** | Orange sidebar, red header; program-locked filters. |
| College Admin | `/admin/college/*` | Same shell; campus scope filters. |
| CAS Admin | `/admin/cas/*` | Same shell. |
| GEC Chairman | `/admin/gec/*` | Same shell; vacant-slot and request-access modules. |
| DOI Admin | `/doi/*` | Same shell; reviews & policy emphasis. |
| Instructor | `/faculty/*` — **PortalShell** | Lighter portal nav. |
| Student | `/student/*` — **PortalShell** | Student nav. |

---

## End-to-end flow (narrative)

1. **Chairman** builds a draft in the **Evaluator**, validates conflicts, previews **INS** views, and **forwards** a package to **College Admin** via **Inbox**.
2. **College Admin** reviews, may run **schedule review** / conflict checks, handles **access requests**, and forwards toward **CAS** as policy dictates.
3. **CAS Admin** splits or routes **GEC** portions to **GEC Chairman**.
4. **GEC Chairman** fills **only** vacant slots that carry **GEC subjects** for eligible programs; slot edits that need institutional clearance trigger **approval requests** to the **College Admin** for that college.
5. **College Admin** (and possibly **CAS**) escalate toward **DOI** when ready.
6. **DOI Admin** performs **final policy review**, may **request justification** from **Chairman**, **approves** with **digital signature**, and triggers **notifications** so **instructors** and **students** consume the published schedule.

---

## Diagramming tips

- Draw a single **system boundary** rectangle labeled **OptiCore**.
- Place **GEC Chairman** near **College Admin** and connect **«extend»** / **«include»** to **Approve vacant-slot / access** use cases.
- Keep **DOI Admin** on the opposite side of the boundary from students to show final gatekeeping.
- Use notes (UML comment) for: *“GEC Chairman UI equals admin shell; write access limited to GEC vacant slots + approvals.”*
