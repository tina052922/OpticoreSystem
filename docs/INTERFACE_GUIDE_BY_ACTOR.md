# OptiCore — Interface Guide by Actor

This document describes **distinct user interfaces** per system actor: layout, main components, key features, a short **narrative flow**, and a **screenshot list** for documentation or presentations. It reflects the **current Next.js app** (`web/`), including **`CampusIntelligenceShell`** (administrative roles) and **`PortalShell`** (faculty and students).

---

## How interfaces are separated

| Shell | Roles | Route prefixes | Distinctive traits |
|--------|--------|----------------|-------------------|
| **Campus Intelligence** | Chairman, College Admin, CAS Admin, GEC Chairman, DOI | `/chairman/*`, `/admin/college/*`, `/admin/cas/*`, `/admin/gec/*`, `/doi/*` | Crimson gradient header, gray sidebar with **icon + label** nav, **role label** under the header, **live notification bell** (`NotificationBell`), semester chip (decorative), **Profile** only via **avatar** dropdown |
| **Portal** | Instructor, Student | `/faculty/*`, `/student/*` | Same header branding; sidebar shows **Faculty** or **Student** badge; **text-only** nav links; header **bell** is a **static indicator** (not wired to `Notification` realtime like the admin bell) |

Authentication is **role-gated**: each layout calls the appropriate session helper (`getChairmanSession`, `requireRoles`, `getDoiSession`, etc.) so users only reach their portal.

---

## 1. Chairman Admin (`chairman_admin`)

### Interface guide

- **Layout:** `CampusIntelligenceShell` — fixed header (~99px), collapsible **sidebar** on small screens (hamburger opens drawer), main content scrolls on light gray (`#F8F8F8`).
- **Header:** CTU logo, **OptiCore** title, optional **Campus Navigation** shortcut, **`NotificationBell`** (Supabase realtime on `Notification`), **avatar** → Profile / Logout.
- **Sidebar:** Role line **“Chairman admin · CTE”**, orange **semester chip** (display), then links with icons (see `CHAIRMAN_NAV` in `web/lib/admin-nav.ts`).
- **Main features:**
  - **Campus Intelligence** (`/chairman/dashboard`) — `CiDashboard`: metric cards, Recharts bar/pie placeholders, quick links, sample “recent activity” (UI demo).
  - **INS Form (Schedule View)** — live schedule grids tied to `ScheduleEntry` where RLS allows.
  - **Evaluator** — **full program plotter** (`EvaluatorPage` variant `chairman`): timetabling grid, conflict checks, load tab (sample institutional rows), INS preview, save/upsert to `ScheduleLoadJustification` when policies violated.
  - **Inbox** — `InboxWorkspace` with workflow mail (`WorkflowInboxMessage`), forward/share.
  - **Faculty Profile** / **Subject Codes** — CRUD within RLS.
  - **Campus navigation** — shared map page.

### Narrative flow

1. Sign in → redirect to **Chairman** home (`/chairman/dashboard`).
2. Open **Evaluator** → select period/sections → plot classes → run **conflict** scan → **save** (may notify college admins; may require **overload justification**).
3. Optionally **preview INS** and adjust **Subject Codes** / **Faculty Profile**.
4. Use **Inbox** to forward coordination messages to College/CAS/GEC/DOI.
5. **Profile** from avatar; **notifications** from header bell.

### Screenshot list

| # | Screen / area | Route or component |
|---|----------------|-------------------|
| 1 | Login | `/login` |
| 2 | Dashboard — full width, charts + quick links | `/chairman/dashboard` |
| 3 | Sidebar + active state (e.g. Evaluator) | Any `/chairman/*` with nav visible |
| 4 | Mobile drawer open | Narrow viewport, hamburger open |
| 5 | Evaluator — timetabling tab + table | `/chairman/evaluator` |
| 6 | Evaluator — conflict / policy message area | Same (after triggering a conflict) |
| 7 | INS faculty view | `/chairman/ins/faculty` |
| 8 | Inbox — list + message | `/chairman/inbox` |
| 9 | Subject Codes or Faculty Profile | `/chairman/subject-codes` or `/chairman/faculty-profile` |
| 10 | Notification bell dropdown | Header on any chairman page |
| 11 | Avatar → Profile | `/chairman/profile` |

---

## 2. College Admin (`college_admin`)

### Interface guide

- **Same shell** as Chairman; **different sidebar** (`COLLEGE_ADMIN_NAV`): adds **Access requests**, **Audit log**; **Central Hub Evaluator** instead of chairman-only plotter.
- **Role label:** e.g. **“College admin · CTE”** (from layout).
- **Key features:**
  - **Central Hub Evaluator** — `CentralHubEvaluatorView`: college tiles + cross-program **read** context (not the chairman’s single-program plotter).
  - **Access requests** — approve/reject scoped **`AccessRequest`** (`evaluator`, `ins_forms`, `gec_vacant_slots`).
  - **Audit log** — `AuditLog` via API (access + inbox actions, not every schedule line).
  - **INS**, **Inbox**, **Faculty Profile**, **Subject Codes** — same family as chairman, college-scoped RLS.

### Narrative flow

1. Land on **`/admin/college`** (Campus Intelligence dashboard).
2. Review **Access requests** from GEC/CAS → approve scopes with expiry.
3. Use **Central Hub** to monitor schedules across the college context.
4. Open **Audit log** for governance actions.
5. Coordinate via **Inbox**; manage catalogs as needed.

### Screenshot list

| # | Screen / area | Route |
|---|----------------|--------|
| 1 | College dashboard | `/admin/college` |
| 2 | Access requests table | `/admin/college/access-requests` |
| 3 | Audit log | `/admin/college/audit-log` |
| 4 | Central Hub Evaluator | `/admin/college/evaluator` |
| 5 | Recent activity card (if shown on dashboard) | `/admin/college` |
| 6 | Inbox | `/admin/college/inbox` |
| 7 | Profile via avatar | `/admin/college/profile` |

---

## 3. CAS Admin (`cas_admin`)

### Interface guide

- **CampusIntelligenceShell** with **`CAS_ADMIN_NAV`**.
- **Distinct item:** **GEC distribution** (`/admin/cas/distribution`) — coordination page for GEC workload (copy in UI references `ScheduleEntry` / GEC subjects).
- **No** “Access requests” in nav (College Admin owns that); includes **Audit log**, **Central Hub**, **INS**, **Inbox**, **Faculty Profile**, **Subject Codes**.

### Narrative flow

1. Open **`/admin/cas`** dashboard.
2. Use **GEC distribution** to align with institutional narrative (forward/split GEC work).
3. **Inbox** with College/GEC/DOI; **Central Hub** for read context.
4. Audit as needed.

### Screenshot list

| # | Screen / area | Route |
|---|----------------|--------|
| 1 | CAS dashboard | `/admin/cas` |
| 2 | GEC distribution | `/admin/cas/distribution` |
| 3 | Central Hub Evaluator | `/admin/cas/evaluator` |
| 4 | Inbox | `/admin/cas/inbox` |
| 5 | Audit log | `/admin/cas/audit-log` |

---

## 4. GEC Chairman (`gec_chairman`)

### Interface guide

- **Same visual shell**, **narrower nav** (`GEC_CHAIRMAN_NAV`) — emphasizes **Request access**, **Vacant GEC slots**, **Inbox**; **no** Faculty Profile / Subject Codes / Evaluator in sidebar (lighter coordinator role in UI).
- **Vacant GEC slots** — `GecVacantSlotsClient`: edit only **vacant** GEC cells when an approved **`gec_vacant_slots`** scope exists; otherwise read-only with explanation + link to request access.
- **Request access** — submit **`AccessRequest`** to College Admin for temporary scopes.

### Narrative flow

1. Dashboard **`/admin/gec`** — shortcuts (e.g. vacant slots, policy-oriented copy).
2. If editing is locked → **Request access** with required scopes → wait for College Admin.
3. **Vacant GEC slots** → fill instructor/room/time only in allowed cells.
4. **Inbox** for CAS/College coordination.

### Screenshot list

| # | Screen / area | Route |
|---|----------------|--------|
| 1 | GEC dashboard | `/admin/gec` |
| 2 | Request access form | `/admin/gec/request-access` |
| 3 | Vacant GEC slots — read-only banner | `/admin/gec/vacant-slots` (without grant) |
| 4 | Vacant GEC slots — editable state | Same route (with approved scope) |
| 5 | Inbox | `/admin/gec/inbox` |
| 6 | Profile | `/admin/gec/profile` |

---

## 5. DOI Admin (`doi_admin`)

### Interface guide

- **CampusIntelligenceShell** + **`DOI_ADMIN_NAV`**.
- **Unique:** **Policy reviews** (`/doi/reviews`) — lists **`ScheduleLoadJustification`** rows (chair-authored text, violations snapshot).
- **Central Hub Evaluator** + **INS** — campus-wide **read** context like College/CAS.
- **Audit log** — campus-wide visibility where RLS allows (see DOI audit page subtitle).

### Narrative flow

1. **`/doi/dashboard`** — dashboard + responsibility cards + link to **Policy reviews**.
2. **Central Hub** / **INS** — review schedules across colleges.
3. **Policy reviews** — read overload justifications; no separate “approve” button in schema.
4. **Inbox** / **Audit** as needed.

### Screenshot list

| # | Screen / area | Route |
|---|----------------|--------|
| 1 | DOI dashboard + quick actions | `/doi/dashboard` |
| 2 | Policy reviews list | `/doi/reviews` |
| 3 | Central Hub | `/doi/evaluator` |
| 4 | INS schedule view | `/doi/ins/faculty` |
| 5 | Audit log | `/doi/audit-log` |
| 6 | Inbox | `/doi/inbox` |

---

## 6. Instructor (`instructor`)

### Interface guide

- **`PortalShell`** — **Faculty** badge in sidebar, **text-only** navigation (no Lucide icons in sidebar).
- **Header:** Same branding; **Campus Navigation**; **bell** (static UI indicator); **avatar** → **Logout** only (no **Profile** link in current faculty/student pages — `profileHref` is not passed to `PortalShell`).
- **Nav:** Dashboard, **My schedule**, **Request change**, **Announcements**, **Campus navigation**.
- **Features:**
  - **Dashboard** — welcome, summary cards (hours, students, sections), schedule preview, links.
  - **My schedule** — table from `getInstructorScheduleRows` (day, time, course, section, room).
  - **Request change** — placeholder/request flow page.
  - **Announcements** — portal announcements page.

### Narrative flow

1. **`/faculty`** — see overview and quick links.
2. **`/faculty/schedule`** — full teaching schedule for current period.
3. Optional: **Request change**, **Announcements**; **Campus navigation** for wayfinding.

### Screenshot list

| # | Screen / area | Route |
|---|----------------|--------|
| 1 | Faculty dashboard | `/faculty` |
| 2 | My schedule table | `/faculty/schedule` |
| 3 | Request change | `/faculty/request-change` |
| 4 | Announcements | `/faculty/announcements` |
| 5 | Portal sidebar — Faculty badge | Any `/faculty/*` |
| 6 | Mobile sidebar open | `/faculty` narrow width |

---

## 7. Student (`student`)

### Interface guide

- **`PortalShell`** with **Student** badge.
- **Nav:** Dashboard, **My schedule**, **Announcements**, **Campus navigation** (no “Request change”).
- **Dashboard** — welcome with program/section/period; **My schedule** card; **Announcements** teaser; **notifications** block from `getRecentNotifications` (data in page, separate from header bell styling).

### Narrative flow

1. **`/student`** — overview, upcoming classes snippet, notifications list on page.
2. **`/student/schedule`** — section schedule table.
3. **`/student/announcements`** — read announcements.

### Screenshot list

| # | Screen / area | Route |
|---|----------------|--------|
| 1 | Student dashboard | `/student` |
| 2 | My schedule | `/student/schedule` |
| 3 | Announcements | `/student/announcements` |
| 4 | Portal sidebar — Student badge | Any `/student/*` |

---

## Cross-actor shots (optional)

| Purpose | What to capture |
|---------|------------------|
| **Brand consistency** | Header gradient + logo across one admin page and one portal page |
| **Responsiveness** | Same actor, desktop vs ~375px width (drawer) |
| **Shared page** | `/campus-navigation` (any role) |
| **Login** | `/login` before role redirect |

---

## File references (for maintainers)

- Admin navigation: `web/lib/admin-nav.ts`
- Shells: `web/components/campus-intelligence/CampusIntelligenceShell.tsx`, `web/components/portal/PortalShell.tsx`
- Layouts: `web/app/chairman/layout.tsx`, `web/app/admin/college/layout.tsx`, `web/app/admin/cas/layout.tsx`, `web/app/admin/gec/layout.tsx`, `web/app/doi/layout.tsx`, faculty/student pages wrapping `PortalShell`

---

*End of interface guide.*
