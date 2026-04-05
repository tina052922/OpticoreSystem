# OptiCore — Narrative Explanations for User Interface Screenshots

This document supplies **ready-to-use narrative text** for thesis figures, slideshows, or documentation: what each screenshot should show, and **what story it tells** about OptiCore’s role-based interfaces, centralized hub workflow, and governance features. Use **sanitized or fictionalized data** in captures where real names or schedules must be protected.

**Alignment with the thesis chapter.** Numbered figures **Figure 1–Figure 20** in **`docs/METHODOLOGY_PAPER_SECTIONS.md`** (§4.3) correspond to the GUI and use case list there; subsection titles below use **descriptive names**—map **Login** → Figure 1, **Chairman Evaluator** → Figure 4, **Chairman Inbox** → Figure 5, **College Inbox** → Figure 7, **Central Hub landing** → Figure 8, **Central Hub selected** → Figure 9, **GEC Request access** → Figure 11, **Access requests** → Figure 12, **Vacant slots** → Figure 13, **INS** → Figure 14, **Dashboard** → Figure 15, **Mobile** → Figure 16, **DOI reviews** → Figure 17, **Notifications** → Figure 18, **Profile** → Figure 19, **Faculty/Student portal** → Figure 20. Use case diagrams (Figures 2–3, 6, 10) are listed in §4.3 without duplicate narratives here.

**How to read each entry**

- **Capture** — Composition and UI elements to include in the frame.
- **Narrative** — Paragraph suitable as a **figure caption** or **slide explanation** (edit tense to match your chapter: present for “Figure X shows…”, future for methodology).

---

## Administrative and workflow (centralized hub narrative)

### Figure — Login (`/login`)

**Capture.** Full viewport of the login page: branding, institution name, email/password fields, sign-in control, and any error or “next route” hint after authentication.

**Narrative.** This screen establishes the **entry point** to OptiCore. It demonstrates that access is **authenticated** and that successful sign-in will **route each actor** to the correct portal (Campus Intelligence for administrative roles, PortalShell for faculty and students). Including it in the document shows that the system separates **public** access from **role-scoped** application areas.

---

### Figure — Chairman Evaluator (`/chairman/evaluator`)

**Capture.** The **Timetabling & Optimization** view with the schedule grid or overview table visible; include period/program filters if shown, and—if possible—a **saved** row or a **conflict** indicator so evaluators can see validation feedback.

**Narrative.** This figure illustrates the **program-scoped Chairman** workspace where **`ScheduleEntry`** data is **authored and persisted**. It supports the thesis claim that draft schedules are **not** merely sketched offline: they are stored in the shared database that later feeds the **Central Hub**. If conflict highlighting appears, the narrative can mention **client-side overlap detection** (instructor, room, section) as part of schedule feasibility.

---

### Figure — Chairman Inbox — forward (`/chairman/inbox`)

**Capture.** Chairman inbox with the **Forward to College Admin** banner visible; optionally show **Sent** with a forwarded item so the workflow handoff is visible.

**Narrative.** This screen documents the **coordination step** after plotting: the Chairman **forwards** a **workflow message** that references INS and Evaluator routes. The narrative should clarify that this action **records** communication (`WorkflowInboxMessage`) and **audit** metadata while the **authoritative schedule** remains in **`ScheduleEntry`**—supporting the **centralized hub** story (no need to attach duplicate spreadsheets for every review round).

---

### Figure — College Admin Inbox — receive and download (`/admin/college/inbox`)

**Capture.** **Mail** tab with a message from the Chairman selected; open the preview **menu** (three dots) so **Download** is visible, or show the downloaded `.txt` in a separate inset if required.

**Narrative.** This figure shows the **receiver’s perspective**: the College Admin **obtains** the forwarded workflow item and may **download** the message text for filing. The explanation should tie the download to **documentation and traceability**, while repeating that **live review** of schedules happens through the **Central Hub** reading the same persisted rows—not through re-importing the text file as master data.

---

### Figure — Central Hub Evaluator — college landing (`/admin/college/evaluator`)

**Capture.** The **Colleges** tab active, showing **tiles or buttons** for each college (and campus-wide option if present). Include the shell header and sidebar so **role** (College Admin) is obvious.

**Narrative.** This figure introduces the **Central Hub** as the place where **cross-cutting admins** open **consolidated** schedule context **by college**. It visually supports the methodology point that **one shared repository** replaces repeated back-and-forth file exchange: users **navigate** to a college rather than receiving a new export each time.

---

### Figure — Central Hub — college selected (`/admin/college/evaluator?college=…`)

**Capture.** Same module with a **specific college** selected—**Timetabling & Optimization** (and/or hub table) populated. Prefer enough rows to show **read-only insight** without overcrowding.

**Narrative.** This screen demonstrates **centralized visibility**: after the Chairman’s saves, **College, CAS, GEC, or DOI** (per permissions) **inspect** schedules for the chosen unit. The caption should state that this view **queries** the same **`ScheduleEntry`** store the Chairman populated, aligning UI evidence with the **data model** and **RLS** story.

---

### Figure — GEC Request access (`/admin/gec/request-access`)

**Capture.** The access request form with **scopes** (Evaluator, INS forms, vacant GEC slots) and note field; submit button visible.

**Narrative.** This figure explains **approval gating**: roles that need **edit** or extended **view** rights (for example GEC vacant-slot editing) **request** temporary scopes from the **owning College Admin**. It supports the claim that **centralized viewing** does not automatically mean **unrestricted editing**—policy is enforced through **`AccessRequest`** and expiry.

---

### Figure — College Admin Access requests (`/admin/college/access-requests`)

**Capture.** List or cards showing **pending** and/or **approved** requests with **scopes**, requester, dates, and approve/reject actions.

**Narrative.** This screen shows the **control point** where the College Admin **grants** or **denies** scoped access. The narrative links **governance** to the hub: only after approval (where required) may a GEC user **edit vacant slots** or use additional evaluator features, which keeps **centralized data** under **role-appropriate** change management.

---

### Figure — GEC Vacant slots (`/admin/gec/vacant-slots`)

**Capture.** Two variants if possible: (1) **read-only** state with banner explaining approval needed; (2) **editable** state after an approved **`gec_vacant_slots`** grant. Otherwise one clear capture with explanatory banner.

**Narrative.** This figure grounds **GEC-specific** work in the UI: editing is limited to **vacant** cells for **GEC** offerings. The caption should reference **scoped write access** and the **same underlying `ScheduleEntry`** table—showing how localized edits fit the **central repository** model.

---

### Figure — INS Form (`/chairman/ins/faculty` or equivalent)

**Capture.** INS schedule view with **academic period** context visible; include **search/filter** controls (faculty, section, room) if space allows.

**Narrative.** This screen shows **read-facing** schedule presentation derived from **`ScheduleEntry`**. It supports claims about **live** data, **INS** alignment with the evaluator, and **usability** (search and filters) for administrators verifying drafts before or after **inbox** forwarding.

---

### Figure — Campus Intelligence dashboard (`/chairman/dashboard` or `/admin/college`)

**Capture.** Dashboard with **metric cards**, charts (Recharts), and quick links; include welcome line if present.

**Narrative.** This figure presents the **executive-style landing** for Campus Intelligence: high-level indicators and navigation shortcuts. The narrative positions it as the **first screen** after login for admins and as evidence of a **consistent design system** (header, sidebar, orange accents) across roles.

---

### Figure — Mobile navigation (narrow viewport)

**Capture.** Any **CampusIntelligenceShell** page with the **hamburger** open and the **sidebar drawer** overlapping content; width approximately phone size.

**Narrative.** This capture demonstrates **responsive design**: navigation remains usable on small screens for **monitoring** and **light tasks** (inbox, notifications). The caption should mention **accessibility** of layout (touch targets, scroll) as required by the methodology’s **hardware/interface** assumptions.

---

### Figure — DOI Policy reviews (`/doi/reviews`)

**Capture.** List of **`ScheduleLoadJustification`** entries with college, period, author, and justification text (sanitized).

**Narrative.** This screen supports **compliance visibility**: when teaching-load policies are exceeded, chairs record **justifications** that **DOI/VPAA** can **read** in one place. The narrative should avoid implying a **digital signature** unless implemented; it should describe **read-only institutional oversight** tied to persisted justification records.

---

### Figure — Notifications (header bell)

**Capture.** **NotificationBell** dropdown open with at least one **Notification** row; admin shell header visible.

**Narrative.** This figure illustrates **in-app alerts** (for example after certain evaluator saves) and **realtime** updates on **`Notification`**. It complements the inbox by showing **asynchronous** awareness for administrators who are not on the inbox screen.

---

### Figure — Profile via avatar (e.g. `/chairman/profile`)

**Capture.** Profile page reached from the **avatar** menu (optional: split image showing header dropdown + profile fields).

**Narrative.** This screen documents the design choice to keep **Profile** out of the **sidebar** and under the **account menu**, reducing clutter. It also shows **user context** (name, role-related fields) appropriate for **administrative** accounts in the thesis.

---

### Figure — Faculty or Student portal (`/faculty` or `/student`)

**Capture.** **PortalShell** with **Faculty** or **Student** badge in the sidebar, dashboard cards or schedule snippet, lighter nav than Campus Intelligence.

**Narrative.** This figure **contrasts** end-user portals with administrative shells: faculty and students **consume** schedules and announcements rather than **authoring** college-wide grids. It rounds out the story of **role-based UIs** and shows that OptiCore serves both **operations** (Campus Intelligence) and **constituents** (Portal).

---

## Optional supplementary captures

| Topic | Suggested route | Short narrative |
|--------|------------------|-----------------|
| **Audit log** | `/admin/college/audit-log` | Shows **traceability** for access and inbox actions logged in **`AuditLog`**. |
| **CAS GEC distribution** | `/admin/cas/distribution` | Illustrates **CAS** coordination narrative alongside the hub. |
| **Campus navigation** | `/campus-navigation` | Shared **wayfinding** page across roles. |
| **Subject codes / Faculty profile** | `/chairman/subject-codes`, `/chairman/faculty-profile` | **Catalog maintenance** within RLS. |

---

## Tips for thesis or defense

- **Number figures** consistently (e.g. 4.1–4.16) and **refer to them** in §4 (System Methodology) where interfaces are discussed.
- **One idea per figure**: avoid a single cluttered screenshot; use two figures if both “Colleges landing” and “College selected” are important.
- **Annotate** sparingly (numbered callouts) only where the thesis template allows; otherwise rely on this narrative text.

---

*End of screenshot narratives.*
