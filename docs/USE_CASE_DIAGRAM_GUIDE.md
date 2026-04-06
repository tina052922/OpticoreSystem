# OptiCore — Text-Based Use Case Diagram Guide

This guide supports drawing a UML use case diagram for **OptiCore: Campus Intelligence System – CTU Argao**. Actors are **minimal**; relationships use UML stereotypes **«include»** (mandatory sub-behavior) and **«extend»** (optional or conditional extension).

The **authoritative scheduling story** below is the **centralized hub** flow: **`ScheduleEntry`** and **INS** views read the same persisted data; coordination uses **Inbox**, **AccessRequest**, **Central Hub** college selection, and **DOI/VPAA** final publication (**lock** + **notifications**).

---

## Actors (minimal set)

| Actor | Description |
|--------|-------------|
| **Chairman Admin** | Program-scoped; plots **`ScheduleEntry`** in the **Evaluator**, runs **conflict checks**, and—**only when satisfied**—**forwards** the **INS Form + Evaluator** context to the **owning College Admin** via **Inbox** (`WorkflowInboxMessage` with links; data already lives in the database). |
| **College Admin** | College-scoped; **receives** the draft in **Inbox**, may **download** message text and references; **reviews** the same rows in **Central Hub Evaluator** (select **own college** tile). **Approves or rejects** **GEC Chairman** **AccessRequest** / vacant-slot workflow; may **run conflict checks** on schedules before approval. **Cannot** open another college’s hub data **without** going through an **approval / access** path (see **Cross-college rule**). Reviews **instructor schedule-change requests** where implemented. |
| **GEC Chairman** | Uses **Campus Intelligence**; opens **Central Hub**, selects a **college** button to **view** that college’s **centralized** schedule. May **only** place **GEC subjects** into **vacant slots** after **submitting request approval** to the **respective College Admin** and receiving **approval**; then plots GEC offerings in approved scope. |
| **DOI Admin (VPAA)** | **Institutional** oversight; receives the workflow when schedules are **forwarded for finalization**. Performs **campus-wide conflict check** on **INS** (`/doi/ins/…`); on **no conflicts**, **finalizes** (**digital signature**, **`DoiScheduleFinalization`**), **publishes** the term (**`ScheduleEntry`** → **`final`** + **`lockedByDoiAt`**), and triggers **notifications**. May use **Central Hub** and **policy reviews** as implemented. |
| **Instructor** | Views **own** **INS** / schedule; may submit **schedule change requests** to **College Admin** until the term is **VPAA-locked**. |
| **Student** | Views **section** schedule and announcements; receives **notifications** when VPAA **publishes**. |
| **System (OptiCore + Supabase)** | Boundary for auth (RLS), persistence, realtime, inbox, access requests, notifications, and publication APIs. |

*Optional on diagrams:* **CAS Admin** for cross-college **GEC distribution** messaging (if you show CAS in parallel to the main chain—omit if the diagram must stay smallest).

---

## Cross-college rule (College Admin ↔ College Admin)

| Rule | Meaning |
|------|---------|
| **Isolation by default** | A **College Admin** user’s session is scoped to **their college**. **Central Hub** college tiles surface **centralized** `ScheduleEntry` data per college. |
| **No silent cross-college read** | A College Admin **must not** be drawn as freely opening **another college’s** schedule **without** an institutional path—e.g. **`AccessRequest`**, delegated review, or policy-approved scope. Model this as **«extend»** from **Request cross-college access** or omit cross-college viewing unless approval exists. |

Use this when placing **multiple College Admin** actors or showing **hub** navigation: **view own college** is the default use case; **view other college** is **conditional** and **«extend»** only after approval.

---

## Primary use cases (by actor)

### Chairman Admin
- **UC-C01 Authenticate** — Supabase session; RLS limits program/college scope.
- **UC-C02 Plot schedule (Evaluator)** — Create/update **`ScheduleEntry`** for the assigned program.
- **UC-C03 Run conflict check (scoped)** — Validate overlaps (faculty / room / section) before handoff.
- **UC-C04 View INS forms** — Faculty / section / room from live **`ScheduleEntry`**.
- **UC-C05 Forward INS + Evaluator to College Admin** — **Precondition:** conflict check **acceptable** for handoff; sends **Inbox** message with **INS + Evaluator** references; **«include»** persist **`WorkflowInboxMessage`** (no duplicate payload—the hub already holds rows).
- **UC-C06 Manage subject codes & faculty profile** — CRUD within RLS.

### College Admin
- **UC-A01 Authenticate** — College-scoped session.
- **UC-A02 Receive draft via Inbox** — Open **Mail**; read **Chairman** forward; **download** evaluator/INS references as provided.
- **UC-A03 View centralized data** — **Central Hub Evaluator** → select **own college**; **`ScheduleEntry`** is the **single source of truth** (auto-reflected).
- **UC-A04 Review GEC access / vacant-slot request** — **«include»** optional **run conflict check** on relevant schedules before decision.
- **UC-A05 Approve or reject GEC Chairman request** — Unlocks **UC-G** plotting only when **approved** (scope + `AccessRequest` / vacant-slot rules).
- **UC-A06 Audit log** — Review **`AuditLog`** where implemented.
- **UC-A07 Review instructor schedule-change requests** — Approve/reject/mitigate; blocked when **`lockedByDoiAt`** is set (post-VPAA).

### GEC Chairman
- **UC-G01 Authenticate**
- **UC-G02 View centralized hub** — **Central Hub** → click **college** button to **view** that college’s **centralized** schedule (read).
- **UC-G03 Request approval** — **«extend»** **UC-A05**; must occur **before** editing vacant slots for that college.
- **UC-G04 Plot GEC subjects in vacant slots** — **«include»** approved scope from **UC-A05**; only **GEC** offerings in **vacant** cells.

### DOI Admin
- **UC-D01 Authenticate**
- **UC-D02 Receive schedule for finalization** — **Inbox** / workflow handoff after **GEC** contributions (and **Chairman/College** pipeline) as per institutional routing.
- **UC-D03 Campus-wide conflict check** — On **INS** (`/doi/ins/…`): scan **room / faculty / section** across the **campus** for the selected term.
- **UC-D04 VPAA finalize & publish** — **«include»** **UC-D03** when approving; **digital signature** + **`DoiScheduleFinalization`**; **publish** term (**`final`**, **`lockedByDoiAt`**); **«include»** fan-out **notifications**.
- **UC-D05 Policy reviews** — **`ScheduleLoadJustification`** / **`/doi/reviews`** as implemented.

### Instructor / Student
- **UC-I01 View schedule & notifications** — Faculty portal **INS** / schedule.
- **UC-I02 Request schedule change** — **«extend»** **UC-A07** (College Admin); fails if locked.
- **UC-ST01 View section schedule & announcements**

---

## «include» relationships (centralized hub)

| Base use case | «include» | Meaning |
|---------------|-----------|---------|
| **UC-C05 Forward to College Admin** | **Persist workflow + Inbox** | Chairman’s forward is **not** the database of record for **`ScheduleEntry`**; it **documents** handoff. |
| **UC-A03 View centralized data** | **Query `ScheduleEntry` via hub** | Hub **reflects** saved rows automatically. |
| **UC-A04 / UC-A05 GEC review** | **Run conflict check** (optional pass) | College Admin may validate schedules **before** approve/reject. |
| **UC-D04 VPAA finalize & publish** | **UC-D03 Campus-wide conflict check** | Responsible publication **includes** a full scan before lock. |
| **UC-D04 VPAA finalize & publish** | **Notify stakeholders** | Lock + **Notification** inserts for **Chairman**, **College Admin**, **GEC Chairman**, **Instructors**, **Students** (and other roles as implemented). |
| **UC-C02 Plot schedule** | **Validate conflicts** | Local/plot-time validation. |

---

## «extend» relationships

| Extension | Extends | Condition |
|-----------|---------|-----------|
| **UC-G03 Request approval** | **UC-A05** | GEC **cannot** plot until **College Admin** approves. |
| **UC-G04 Plot GEC subjects** | **UC-A05** | Editing **vacant slots** only **after** approval. |
| **UC-I02 Request schedule change** | **UC-A07** | Only while rows are **not** VPAA-locked. |
| **Cross-college hub view** (if modeled) | **UC-A03** | **Only** when another actor’s **AccessRequest** or policy grants scope—otherwise **other College Admin** does **not** see foreign college data. |

---

## End-to-end flow (arrows)

Use this **arrow chain** on the diagram or in appendix notes:

```
Chairman Admin
  → [Evaluator: plot ScheduleEntry]
  → [Run conflict check — scoped]
  → (if acceptable)
  → [Forward INS + Evaluator refs via Inbox → College Admin]

College Admin
  → [Inbox: receive draft]
  → [Download / open references]
  → [Central Hub Evaluator: own college tile — data already centralized]

Other College Admin / GEC Chairman
  → [Central Hub: click college button — view centralized schedule]
  → (College Admin: other college — **no cross-college access** without approval path)

GEC Chairman
  → [Request approval → respective College Admin]
  → (College Admin: run conflict check → approve | reject)
  → (if approved)
  → [Plot GEC subjects only in vacant slots]

College Admin
  → [Forward / workflow toward DOI Admin — after GEC additions]

DOI Admin
  → [Campus-wide conflict check on INS]
  → (if no conflicts)
  → [Finalize & approve — VPAA signature / DoiScheduleFinalization]
  → [Publish: lock ScheduleEntry — lockedByDoiAt]
  → [Notifications → Chairman Admin, College Admin, GEC Chairman, Instructors, Students]
```

---

## End-to-end flow (narrative) — centralized hub

1. **Chairman Admin** plots schedules in the **Evaluator** (`ScheduleEntry`), runs a **conflict check** on the scoped plot, and—when the result is **acceptable for handoff**—**forwards** the **INS Form + Evaluator** context to the **College Admin** via **Inbox** (links and message text; **no** re-upload of the timetable—the database is already authoritative).

2. **College Admin** receives the draft in **Inbox**, may **download** or open the referenced **evaluator** and **INS** material. The **same** rows are **automatically** visible in the **Central Hub Evaluator** when the admin selects **their college**—centralization is **not** a separate manual merge step.

3. **Other College Admins** and **GEC Chairmen** **view** centralized schedules by opening **Central Hub** and **clicking the respective college** control. **A College Admin must not access another college’s data** without an **approved** access / delegation path (**AccessRequest** or equivalent policy).

4. **GEC Chairman** may **only** enter **GEC subjects** into **vacant** slots. **First**, they **submit a request for approval** to the **owning College Admin**. The **College Admin** **reviews** the request, may **run conflict checks** on the relevant schedules, then **approves** or **rejects**. **After approval**, the **GEC Chairman** may **plot** GEC subjects in the **vacant** slots.

5. After **GEC** subjects are added, the schedule is **forwarded** (workflow / Inbox) toward **DOI Admin** for **institutional** finalization.

6. **DOI Admin** runs a **campus-wide conflict check** on INS. If **no conflicts** remain, they **finalize** and **approve** (VPAA **digital signature**, **`DoiScheduleFinalization`**).

7. **Upon DOI approval**, schedules are **published** and **locked** (`final` + `lockedByDoiAt`); **no further editing** by normal hub roles. **Notifications** are sent to **Chairman Admin**, **College Admin**, **GEC Chairman**, **Instructors**, and **Students** (and other roles as configured).

---

## Which UI each actor sees

| Actor | Shell / route prefix | Primary surfaces in this flow |
|-------|----------------------|------------------------------|
| Chairman Admin | `/chairman/*` — **CampusIntelligenceShell** | **Evaluator**, **INS** (`/chairman/ins/…`), **Inbox** (forward). |
| College Admin | `/admin/college/*` — **CampusIntelligenceShell** | **Inbox**, **Central Hub Evaluator** (college tile), **Access requests**, **schedule change requests** (if enabled). |
| GEC Chairman | `/admin/gec/*` — **CampusIntelligenceShell** | **Central Hub** (college selection), **Request access**, **Vacant GEC slots** (after approval). |
| DOI Admin | `/doi/*` — **CampusIntelligenceShell** | **INS** campus-wide (`/doi/ins/…`), **VPAA** approval panel, **Inbox**, **Policy reviews** (`/doi/reviews`). |
| Instructor | `/faculty/*` — **PortalShell** | **INS**, **My schedule**, **Request change**. |
| Student | `/student/*` — **PortalShell** | **My schedule**, **Announcements**. |

---

## Diagramming tips

- Draw one **system boundary** labeled **OptiCore** (or **OptiCore + Supabase**).
- Show **Chairman** → **Evaluator** → **conflict check** → **Inbox forward** → **College Admin** on the **left-to-mid** band.
- Place **Central Hub** as a **single** use case **included** by every “view centralized schedule” path; **annotate** college **tile** selection.
- **GEC Chairman** sits **adjacent** to **College Admin** (owning college): **«extend»** from **Request approval** to **Approve GEC request**, then **«include»** **Plot vacant GEC slots**.
- **DOI Admin** to the **right**: **«include»** **Campus-wide conflict check** inside **VPAA finalize & publish**; **note** **lock** + **notifications**.
- **Annotate** the **cross-college rule** with a note or a **conditional** **«extend»** on **View other college hub** (only with approval).
- For alignment with a **Mermaid** overview, see **`docs/ROLE_UIFLOWS_AND_ARCHITECTURE.md`** (*Use case diagram (flow)*).

