# OptiCore — Text-Based Use Case Diagram Guide

This guide supports drawing a UML use case diagram for **OptiCore: Campus Intelligence System – CTU Argao**. Actors are kept minimal; relationships use UML stereotypes **«include»** (mandatory sub-behavior) and **«extend»** (optional/conditional extension).

---

## Actors (minimal set)

| Actor | Description |
|--------|-------------|
| **Chairman Admin** | Program-scoped chair; plots and saves **`ScheduleEntry`** data, uses INS views, then **forwards** a workflow message (INS + Evaluator references) to **College Admin** via Inbox so coordination is documented without re-sending grid payloads. |
| **College Admin** | College-scoped; **receives** forwarded mail, may **download** the message text, and **reads the same persisted schedule rows** in the **Central Hub Evaluator** (college tiles). Reviews **access requests** and **audit**; may view cross-college hub context where policy allows. |
| **CAS Admin** | Receives college forwards; coordinates GEC distribution. |
| **GEC Chairman** | Uses the **same Campus Intelligence shell**; opens **Central Hub** to **view** schedules by college after the Chairman’s data is **centralized** in **`ScheduleEntry`**. Edits **only** **vacant GEC slot** cells relevant to GEC offerings; **editing** requires an **AccessRequest** ( **`gec_vacant_slots`** scope) approved by the **owning College Admin**—avoiding repeated back-and-forth of files because the hub already holds the authoritative rows. |
| **DOI Admin** | Same **Campus Intelligence** shell and **Central Hub** evaluator/schedule views as other campus admins; dedicated **Policy reviews** page lists **`ScheduleLoadJustification`** rows (chair-authored text when loads exceed policy). **No** persisted DOI approve/reject or digital-signature record in the database—**notifications** are used for in-app alerts (for example certain evaluator saves), not a full “publication” workflow. |
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
- **UC-C05 Forward draft to College Admin** — Inbox **`WorkflowInboxMessage`** with links to INS and Evaluator; persists audit + mail; **does not** duplicate `ScheduleEntry` rows (data already saved).
- **UC-C06 Manage subject codes & faculty profile** — CRUD within RLS.

### College Admin
- **UC-A01 Authenticate** — College-scoped session.
- **UC-A02 Review inbox & workflow** — Mail/sent; **download** message text; persisted `WorkflowInboxMessage`.
- **UC-A03 Open Central Hub Evaluator** — **Colleges** tab → select college → read **centralized** `ScheduleEntry` / hub context; **editing** (e.g. vacant GEC slots) requires **UC-A04** / **UC-A05** for the requesting user.
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
- **UC-D02 View Central Hub schedules** — Read-oriented evaluator context across colleges (same hub pattern as College/CAS).
- **UC-D03 Read load-policy justifications** — Open **`/doi/reviews`**; data from **`ScheduleLoadJustification`** (written by chairs when saving under violations).
- **UC-D04 Use inbox / audit** — Same persisted **`WorkflowInboxMessage`** and **`AuditLog`** visibility as other admin roles where RLS allows.
- **UC-D05 Receive notifications** — **`Notification`** rows; realtime updates in the notification bell for new inserts.

### Instructor / Student
- **UC-I01 View assigned schedule / notifications**
- **UC-ST01 View own section schedule and announcements**

---

## «include» relationships (examples)

| Base use case | «include» | Meaning |
|---------------|-----------|---------|
| **UC-C02 Manage program schedule** | **Validate conflicts** | Conflict detection is part of responsible plotting. |
| **UC-C05 Forward draft** | **Persist workflow message** | Forwarding writes **`WorkflowInboxMessage`** + audit; College Admin reads mail; schedule state remains in **`ScheduleEntry`**. |
| **UC-A03 Open Central Hub** | **Query shared schedule repository** | Hub reads persisted rows; avoids repeated attachment exchange. |
| **UC-G04 Propose vacant-slot edits** | **Submit approval to College Admin** | Cannot complete slot change without approval path. |
| **UC-C02 Manage program schedule** | **Persist justification** | When policies are exceeded, saving can upsert **`ScheduleLoadJustification`**. |

## «extend» relationships (examples)

| Extension | Extends | Condition |
|-----------|---------|-----------|
| **UC-D03 Read justifications** | **UC-D02 View Central Hub** | When chairs have saved under policy violations, justification text exists for DOI to read—no in-app “request justification” action. |
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

## End-to-end flow (narrative) — centralized hub

1. **Chairman Admin** (program-scoped) plots in the **Evaluator**, runs **conflict** checks (with root-cause overlap), filters **prospectus** / subject scope as implemented, **saves** rows to **`ScheduleEntry`**, and previews **INS** forms (search/filter as available).
2. **Chairman** **forwards** a **workflow message** to **College Admin** (INS + Evaluator links in the body; message persisted in **`WorkflowInboxMessage`**). The schedule **does not** travel only inside the email—the **authoritative copy** is already **centralized** in the database.
3. **College Admin** **receives** mail under Inbox, may **download** the message for records, and opens **Central Hub Evaluator** to **review the same persisted data** by **selecting the college**—avoiding continuous re-sending of evaluator exports.
4. **CAS Admin**, **other College Admins**, **GEC Chairman**, and **DOI Admin** (per RLS) use **Central Hub** to **view** consolidated schedules; **GEC** (and others lacking edit rights) **submit `AccessRequest`** to the **owning College Admin** before **editing vacant GEC slots** or other scoped actions.
5. **College Admin** **approves** or **rejects** **AccessRequest** records; **notifications** and **audit** entries support traceability.
6. **CAS Admin** may **forward** coordination messages toward **GEC** / **DOI** as policy dictates.
7. **DOI Admin** reads **Central Hub** schedules and **`/doi/reviews`** (**`ScheduleLoadJustification`**). No separate digital-signature column is assumed in the baseline schema.

---

## Diagramming tips

- Draw a single **system boundary** rectangle labeled **OptiCore**.
- Place **GEC Chairman** near **College Admin** and connect **«extend»** / **«include»** to **Approve vacant-slot / access** use cases.
- Place **DOI Admin** to show **cross-college read** and **justification visibility** rather than a separate “approve” use case unless you document an external process.
- Use notes (UML comment) for: *“GEC Chairman UI equals admin shell; write access limited to GEC vacant slots + approvals.”*
