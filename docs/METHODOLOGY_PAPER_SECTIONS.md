# OptiCore: Campus Intelligence System — CTU Argao  
## Methodology & Methods (Thesis Chapter Draft)

*The research-oriented subsections **3.3–3.5** below retain the thesis’s instruments and data-treatment narrative. **SYSTEM METHODOLOGY** (§4.1–4.10) follows the required deliverable structure: development summary, external interfaces (four sub-types), functional requirements, use cases and GUI figures, data design, architecture, performance, security and **RA 10173**, other non-functional requirements, software stack, and operations/cost. Adapt numbering to the institution’s template.*

---

## 3.3 Research Instruments

The investigation will employ a **fully functional web-based information system** as the primary research artifact. The **OptiCore: Campus Intelligence System** prototype will serve as both the intervention and the instrument through which scheduling workflows, policy visibility, multi-role coordination, and **centralized schedule visibility** will be observed. Data collection instruments will include structured **AuditLog** extracts (governance actions), **surveys**, **semi-structured interviews**, and **observation checklists** aligned with evaluator plotting, inbox forwarding, Central Hub navigation, and **AccessRequest** approvals. The digital platform will constitute a **composite instrument** that generates traceable behavioral data through normal use.

---

## 3.4 Data Gathering Procedure

Data will be gathered in **phases**: baseline encoding of catalogs; **prototype deployment** with persisted `ScheduleEntry`, notifications, workflow messages, justifications, and access requests under **RLS**; **transaction log extraction** with pseudonymization where required; **instrument administration** after at least one full coordination cycle (plot → forward → hub review → access approval as applicable); and **triangulation** of metrics with qualitative themes. Electronic data will reside in **encrypted Supabase** storage with token rotation per IT policy.

---

## 3.5 Statistical Treatment / Treatment of Data

Quantitative indicators will be summarized with **descriptive statistics** and, where appropriate, **non-parametric tests** for small administrative samples. Qualitative transcripts will undergo **thematic analysis**; system logs will **corroborate** self-reports where available. Missing data will be reported transparently.

---

# SYSTEM METHODOLOGY

## Development approach summary

The OptiCore system will be developed as a **web-centric, cloud-backed** application using **Next.js 15** (App Router), **TypeScript**, **Tailwind CSS**, and **Supabase** (PostgreSQL, authentication, Row Level Security, and optional Realtime). Development will follow an **iterative** pattern: reference data and RLS policies will be established in versioned **SQL migrations**; UI shells (**CampusIntelligenceShell** for administrative actors, **PortalShell** for faculty and students) will enforce **role-based** navigation; and scheduling logic will center on a **single persisted `ScheduleEntry` repository** surfaced by the **Chairman Evaluator** (program-scoped authoring) and by the **Central Hub Evaluator** (cross-college reading by college selection). The **Chairman** will **forward** workflow messages to the **College Admin** after plotting; the College Admin will **receive** and may **download** message text for records, while **authoritative schedule state** remains in the database—reducing repeated exchange of attachments. **Approval-gated** scopes (**`AccessRequest`**) will control sensitive edits such as **vacant GEC slots**. This approach aligns implementation with institutional coordination needs while keeping the stack maintainable for academic and pilot deployment contexts.

---

## 4.1 External Interface Requirements

The OptiCore platform will feature **external interfaces** that support user interaction, data exchange, and integration with the **Supabase** backend within the CTU Argao environment. The following subsections describe the **user**, **hardware**, **software**, and **communication** interfaces.

### 4.1.1 User Interface

The **primary user interface** will be **web-based**, implemented with **React** and **Next.js**, and styled with **Tailwind CSS**. It will provide an **interactive and responsive** experience for distinct actors. Design priorities will include **intuitive navigation**, **clear presentation** of schedules and policies, **accessible contrast**, and a **consistent** crimson/orange Campus Intelligence theme for administrators. Key considerations will include:

- **Chairman Admin:** The interface will include modules for **program-scoped** timetable plotting in the **Evaluator**, **conflict detection** with attributable overlaps, **INS Form (schedule views)** with search and filter (including prospectus-oriented filters where implemented), **Inbox** forwarding of INS and Evaluator references to the College Admin, **Faculty Profile** and **Subject Codes** maintenance, and **Campus Intelligence** dashboard summaries.
- **College Admin:** The interface will provide the **Central Hub Evaluator** (college tiles and consolidated read context), **Inbox** (receive and **download** workflow messages), **Access requests** (approve scoped temporary access), **Audit log**, and college-scoped catalog views consistent with RLS.
- **CAS Admin:** The interface will include **Central Hub**, **GEC distribution**, **Inbox**, **Audit log**, and shared administrative modules.
- **GEC Chairman:** The interface will include **Request access**, **Vacant GEC slots** (edit only when an approved **`gec_vacant_slots`** scope exists), **Inbox**, and **Central Hub** read context.
- **DOI Admin:** The interface will include **Central Hub**, **Policy reviews** (load-policy justifications), **Inbox**, **Audit log**, and campus-wide read contexts permitted by policy.
- **Instructor:** The **Portal** interface will support **dashboard**, **my schedule**, **request change**, and **announcements** with a lighter navigation chrome.
- **Student:** The **Portal** interface will support **dashboard**, **my schedule**, and **announcements**.

Administrative users will access **Profile** from the **avatar menu** (not duplicated in the sidebar) where implemented. **Mobile responsiveness** will be supported through **collapsible sidebar** navigation on narrow viewports.

### 4.1.2 Hardware Interface

**A. Server side:** The hosted application will run on **managed cloud** infrastructure (for example **Vercel** or equivalent for the Next.js application, and **Supabase** for the database and auth services). Institutional or project **printers** may be used for **browser-printed** INS-style schedules and reports; they are not programmatic hardware interfaces but operational peripherals.

**B. Client side:** OptiCore will be a **web application**. End users will access it through **desktop computers**, **laptops**, or **tablets** using a **modern web browser** (current **Chrome**, **Edge**, **Firefox**, or **Safari**). **Smartphones** will be supported for **monitoring** and light tasks via the responsive layout. A **stable internet connection** will be required for HTTPS access and Supabase APIs.

### 4.1.3 Software Interface

The OptiCore platform will interact with supporting software through **HTTP APIs** and the **Supabase client libraries**.

**A. Server side:** The **production database** will be hosted on **Supabase (PostgreSQL)** with **Row Level Security** policies defined in **`supabase/migrations`**. A **local or hosted development** database may mirror this schema during construction.

**B. Client side:** The client will run in any **operating system** capable of running a **modern browser** with support for **HTML5**, **ECMAScript** features used by the bundled application, and **TLS** for HTTPS.

**C. Application integration:** The **Next.js** application will communicate with **Supabase Auth** for sessions, with **PostgREST**-backed table access for `ScheduleEntry`, `User`, and related entities, and with **API routes** under `/api/*` for **inbox**, **access requests**, and **audit log** operations. **Realtime** subscriptions will attach to **`Notification`** and **`WorkflowInboxMessage`** where enabled.

### 4.1.4 Communication Interface

The operation of the system will rely on **stable network** connectivity. It will use **TCP/IP**, **HTTP/HTTPS**, and **WebSocket** (where used by Supabase Realtime) for access to the web interface and backend services. Because schedules and personal data are sensitive, **HTTPS** will be **mandatory** in production so that data in transit remain **confidential** and **integrity-protected**. API traffic between the browser and Supabase will use **TLS 1.2+** per platform defaults.

---

## 4.2 Functional Requirements

The functional requirements of OptiCore will be built around **real workflows** for CTU Argao academic scheduling and governance. The system will support **secure authentication** and **role-based** access. It will persist **schedule rows** (`ScheduleEntry`) as the **central repository** for both the **Chairman Evaluator** and the **Central Hub**. It will support **client-side conflict scanning** (instructor, room, section overlap) and **load-policy** checks with optional **`ScheduleLoadJustification`** when policies are exceeded. It will provide **workflow mail** (`WorkflowInboxMessage`) with **forward** and **share** paths, **notifications** for in-app awareness, **access requests** with **scoped** approval by the College Admin, **vacant GEC slot** editing under approved scope, **INS** schedule views aligned with evaluator data, **audit** entries for selected governance actions, and **DOI-facing** justification listing for compliance visibility. **Faculty** and **students** will consume schedules and announcements through the **Portal** modules. Together, these functions will implement a **centralized hub** model: after the Chairman forwards coordination mail, stakeholders will **read** shared persisted data in the hub rather than relying on repeated resending of schedule files.

**Table 1. List of modules (for use case and GUI mapping)**

| Module | Primary actors | Description |
|--------|----------------|-------------|
| Authentication / Login | All | Supabase Auth; role-based redirect to Campus Intelligence or Portal. |
| Campus Intelligence Dashboard | Chairman, College, CAS, GEC, DOI | Summary metrics and quick links (`CiDashboard`). |
| Chairman Evaluator | Chairman | Program-scoped plotting, save, conflict checks, load-policy handling. |
| Central Hub Evaluator | College, CAS, GEC, DOI | College selection; consolidated read of `ScheduleEntry` context. |
| INS Form (Schedule View) | Admins (scoped) | Schedule grids and filters from live data. |
| Inbox / Workflow | Chairman, College, CAS, GEC, DOI | Mail/Sent; forward; download message text; realtime refresh. |
| Access Requests | GEC/CAS (request); College Admin (approve) | Scoped `evaluator`, `ins_forms`, `gec_vacant_slots`. |
| Audit Log | College, CAS, DOI | Review logged governance actions. |
| Notifications | Administrative (bell) | `Notification` inserts; realtime on admin shell. |
| GEC Vacant Slots | GEC Chairman | Vacant-cell edits when scope approved. |
| Policy Reviews | DOI | Read `ScheduleLoadJustification` entries. |
| Faculty Profile / Subject Codes | Chairman, College, CAS, DOI (scoped) | Catalog and profile maintenance within RLS. |
| Campus Navigation | All authenticated | Shared wayfinding page. |
| Faculty Portal | Instructor | Dashboard, schedule, request change, announcements. |
| Student Portal | Student | Dashboard, schedule, announcements. |

---

## 4.3 Use Case Diagram (Actors and Roles Using the List of Modules) and GUI Design (Functional System Screenshots)

**Actors included (per requirement):** **Student**, **Instructor**, **Program Chairman**, **College Admin**, **GEC Chairman**, and **DOI Admin**. The diagrams below use **OptiCore (Web App + Supabase)** as the system boundary and follow UML conventions with straight association lines.

**Diagram standards used**

- Association lines are straight (actor → use case).
- Use case names are action-based verb phrases.
- `<<include>>` = mandatory sub-step reused across flows.
- `<<extend>>` = optional/conditional behavior (only under a condition).

---

### Overall Use Case Diagram — OptiCore (Part 1: Administrative Roles)

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Program Chairman\n(Chairman Admin)" as Chairman
actor "College Admin" as College
actor "GEC Chairman" as GEC
actor "DOI Admin\n(VPAA/DOI)" as DOI

rectangle "OptiCore (Web App + Supabase)" {
  usecase "Log In" as UC_Login
  usecase "View Dashboard" as UC_Dashboard
  usecase "View INS Forms\n(Schedule View)" as UC_INS
  usecase "Select Semester /\nAcademic Term" as UC_Term
  usecase "Switch INS Tab\n(Faculty / Section / Room)" as UC_InsTab

  usecase "Manage Evaluator Schedule\n(Plot & Assign)" as UC_ChairEval
  usecase "Add / Update / Remove\nSchedule Entry" as UC_EditEntry
  usecase "Run Campus-Wide\nConflict Check" as UC_Conflict
  usecase "Apply Suggested\nAlternative Slot" as UC_Suggest
  usecase "Submit Load-Policy\nJustification" as UC_Justify

  usecase "View Central Hub Evaluator\n(College Scope)" as UC_CollegeHub
  usecase "Review Schedule\nChange Requests" as UC_ChangeReq
  usecase "Notify Instructor\nof Decision" as UC_NotifyInst

  usecase "Request Vacant-Slot\nEditing Access" as UC_RequestAccess
  usecase "Submit Access Request" as UC_SubmitAccess
  usecase "View Request Status" as UC_AccessStatus
  usecase "Manage Vacant GEC Slots\n(Central Hub Evaluator)" as UC_GECVacant
  usecase "Select College / Program /\nSection" as UC_SelectScope
  usecase "Add Vacant GEC\nSlot Row" as UC_AddVacantRow
  usecase "Edit Vacant GEC\nSlot Assignment" as UC_EditVacant
  usecase "Save Vacant GEC\nSlot Changes" as UC_SaveVacant

  usecase "Review Load-Policy\nJustifications" as UC_DoiReviews
  usecase "View Policy\nViolations" as UC_Violations
  usecase "Approve Justification" as UC_ApproveJust
  usecase "Reject Justification" as UC_RejectJust

  usecase "Publish and Lock\nSchedules" as UC_PublishLock
  usecase "Lock Schedule Entries\nfor Term" as UC_LockTerm

  usecase "Manage Faculty Profiles" as UC_FacultyProfile
  usecase "Manage Subject Codes" as UC_SubjectCodes
  usecase "Access Campus Navigation" as UC_CampusNav
  usecase "View Profile /\nManage Account" as UC_Profile
}

Chairman -- UC_Login
Chairman -- UC_Dashboard
Chairman -- UC_INS
Chairman -- UC_ChairEval
Chairman -- UC_FacultyProfile
Chairman -- UC_SubjectCodes
Chairman -- UC_CampusNav
Chairman -- UC_Profile

College -- UC_Login
College -- UC_Dashboard
College -- UC_INS
College -- UC_CollegeHub
College -- UC_ChangeReq
College -- UC_FacultyProfile
College -- UC_SubjectCodes
College -- UC_CampusNav
College -- UC_Profile

GEC -- UC_Login
GEC -- UC_Dashboard
GEC -- UC_INS
GEC -- UC_RequestAccess
GEC -- UC_GECVacant
GEC -- UC_FacultyProfile
GEC -- UC_SubjectCodes
GEC -- UC_CampusNav
GEC -- UC_Profile

DOI -- UC_Login
DOI -- UC_Dashboard
DOI -- UC_INS
DOI -- UC_DoiReviews
DOI -- UC_PublishLock
DOI -- UC_CampusNav
DOI -- UC_Profile

UC_INS ..> UC_Term : <<include>>
UC_INS ..> UC_InsTab : <<include>>

UC_ChairEval ..> UC_EditEntry : <<include>>
UC_ChairEval ..> UC_Conflict : <<include>>
UC_Suggest ..> UC_Conflict : <<extend>>
UC_Justify ..> UC_ChairEval : <<extend>>

UC_ChangeReq ..> UC_Conflict : <<include>>
UC_NotifyInst ..> UC_ChangeReq : <<include>>

UC_RequestAccess ..> UC_SubmitAccess : <<include>>
UC_AccessStatus ..> UC_RequestAccess : <<extend>>

UC_GECVacant ..> UC_SelectScope : <<include>>
UC_GECVacant ..> UC_AddVacantRow : <<include>>
UC_GECVacant ..> UC_EditVacant : <<include>>
UC_GECVacant ..> UC_Conflict : <<include>>
UC_GECVacant ..> UC_SaveVacant : <<include>>
UC_Suggest ..> UC_GECVacant : <<extend>>

UC_DoiReviews ..> UC_Violations : <<include>>
UC_ApproveJust ..> UC_DoiReviews : <<extend>>
UC_RejectJust ..> UC_DoiReviews : <<extend>>

UC_PublishLock ..> UC_LockTerm : <<include>>
@enduml
```

**Notes aligned to the current system implementation**

- Schedules are centralized in **`ScheduleEntry`** (the Central Hub reads the same persisted data; the workflow inbox is for coordination, not master data transfer).
- Conflict checking and suggested alternatives are represented as conditional (`<<extend>>`) actions when conflicts exist.

**UI screenshots (immediately after the diagram):**

![Login — /login](docs/screenshots/overall-admin-login.png)

![Chairman Evaluator — /chairman/evaluator](docs/screenshots/overall-admin-chairman-evaluator.png)

![College Central Hub — /admin/college/evaluator](docs/screenshots/overall-admin-college-hub.png)

![GEC Request Access — /admin/gec/request-access](docs/screenshots/overall-admin-gec-request-access.png)

![DOI Policy Reviews — /doi/reviews](docs/screenshots/overall-admin-doi-policy-reviews.png)

---

### Overall Use Case Diagram — OptiCore (Part 2: Instructor & Student)

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Instructor\n(Faculty)" as Instructor
actor "Student" as Student

rectangle "OptiCore (Web App + Supabase)" {
  usecase "Register Account" as UC_Register
  usecase "Log In" as UC_Login
  usecase "View Dashboard" as UC_Dashboard

  usecase "View INS Forms\n(Schedule View)" as UC_INS
  usecase "Select Semester /\nAcademic Term" as UC_Term
  usecase "Switch INS Tab\n(Faculty / Section / Room)" as UC_InsTab
  usecase "View Assigned Sections" as UC_AssignedSections

  usecase "View My Schedule" as UC_MySchedule
  usecase "Request Schedule Change" as UC_RequestChange
  usecase "Select Schedule Entry" as UC_SelectEntry
  usecase "Propose New Day/Time\n(Same Duration)" as UC_ProposeTime
  usecase "Submit Reason" as UC_SubmitReason
  usecase "Notify College Admin" as UC_NotifyCollege

  usecase "Generate INS Form\nby Section" as UC_GenerateInsBySection
  usecase "View Announcements" as UC_Announcements
  usecase "Access Campus Navigation" as UC_CampusNav
  usecase "Manage Account\n(Change Password / Profile)" as UC_Account
}

Instructor -- UC_Register
Instructor -- UC_Login
Instructor -- UC_Dashboard
Instructor -- UC_INS
Instructor -- UC_MySchedule
Instructor -- UC_Announcements
Instructor -- UC_CampusNav
Instructor -- UC_Account

Student -- UC_Register
Student -- UC_Login
Student -- UC_Dashboard
Student -- UC_MySchedule
Student -- UC_GenerateInsBySection
Student -- UC_Announcements
Student -- UC_CampusNav
Student -- UC_Account

UC_INS ..> UC_Term : <<include>>
UC_INS ..> UC_InsTab : <<include>>
UC_INS ..> UC_AssignedSections : <<include>>

UC_MySchedule ..> UC_Term : <<include>>
UC_RequestChange ..> UC_SelectEntry : <<include>>
UC_RequestChange ..> UC_ProposeTime : <<include>>
UC_RequestChange ..> UC_SubmitReason : <<include>>
UC_RequestChange ..> UC_NotifyCollege : <<include>>
UC_RequestChange ..> UC_MySchedule : <<extend>>

UC_GenerateInsBySection ..> UC_Term : <<include>>
@enduml
```

**UI screenshots (immediately after the diagram):**

![Faculty portal home — /faculty](docs/screenshots/overall-portal-faculty-home.png)

![Faculty my schedule — /faculty/schedule](docs/screenshots/overall-portal-faculty-schedule.png)

![Student portal home — /student](docs/screenshots/overall-portal-student-home.png)

![Student schedule — /student/schedule](docs/screenshots/overall-portal-student-schedule.png)

---

### Student — Use Case Diagram

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Student" as Student

rectangle "OptiCore (Student Portal)" {
  usecase "Register Account" as UC_Register
  usecase "Log In" as UC_Login
  usecase "View Dashboard" as UC_Dashboard
  usecase "View My Schedule" as UC_Schedule
  usecase "Generate INS Form\nby Section" as UC_Generate
  usecase "Select Semester /\nAcademic Term" as UC_Term
  usecase "View Announcements" as UC_Announcements
  usecase "Access Campus Navigation" as UC_CampusNav
  usecase "Manage Account\n(Profile if applicable)" as UC_Account
}

Student -- UC_Register
Student -- UC_Login
Student -- UC_Dashboard
Student -- UC_Schedule
Student -- UC_Generate
Student -- UC_Announcements
Student -- UC_CampusNav
Student -- UC_Account

UC_Generate ..> UC_Term : <<include>>
UC_Schedule ..> UC_Term : <<include>>
@enduml
```

**UI screenshots (immediately after the diagram):**

![Student portal home — /student](docs/screenshots/student-home.png)

![Student schedule — /student/schedule](docs/screenshots/student-schedule.png)

![Student announcements — /student/announcements](docs/screenshots/student-announcements.png)

---

### Instructor — Use Case Diagram

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Instructor\n(Faculty)" as Instructor

rectangle "OptiCore (Faculty Portal)" {
  usecase "Register Account" as UC_Register
  usecase "Log In" as UC_Login
  usecase "View Dashboard" as UC_Dashboard

  usecase "View INS Forms\n(Schedule View)" as UC_INS
  usecase "Select Semester /\nAcademic Term" as UC_Term
  usecase "Switch INS Tab\n(Faculty / Section / Room)" as UC_InsTab
  usecase "View Assigned Sections" as UC_AssignedSections

  usecase "View My Schedule" as UC_Schedule
  usecase "Request Schedule Change" as UC_RequestChange
  usecase "Select Schedule Entry" as UC_SelectEntry
  usecase "Propose New Day/Time\n(Same Duration)" as UC_ProposeTime
  usecase "Submit Reason" as UC_SubmitReason
  usecase "Notify College Admin" as UC_NotifyCollege

  usecase "View Announcements" as UC_Announcements
  usecase "Access Campus Navigation" as UC_CampusNav
  usecase "Manage Account\n(Change Password / Profile)" as UC_Account
}

Instructor -- UC_Register
Instructor -- UC_Login
Instructor -- UC_Dashboard
Instructor -- UC_INS
Instructor -- UC_Schedule
Instructor -- UC_Announcements
Instructor -- UC_CampusNav
Instructor -- UC_Account

UC_INS ..> UC_Term : <<include>>
UC_INS ..> UC_InsTab : <<include>>
UC_INS ..> UC_AssignedSections : <<include>>

UC_Schedule ..> UC_Term : <<include>>
UC_RequestChange ..> UC_SelectEntry : <<include>>
UC_RequestChange ..> UC_ProposeTime : <<include>>
UC_RequestChange ..> UC_SubmitReason : <<include>>
UC_RequestChange ..> UC_NotifyCollege : <<include>>
UC_RequestChange ..> UC_Schedule : <<extend>>
@enduml
```

**UI screenshots (immediately after the diagram):**

![Faculty home — /faculty](docs/screenshots/instructor-home.png)

![My schedule — /faculty/schedule](docs/screenshots/instructor-my-schedule.png)

![Announcements — /faculty/announcements](docs/screenshots/instructor-announcements.png)

---

### Program Chairman (Chairman Admin) — Use Case Diagram

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "Program Chairman\n(Chairman Admin)" as Chairman

rectangle "OptiCore (Chairman Admin)" {
  usecase "Log In" as UC_Login
  usecase "View Dashboard" as UC_Dashboard
  usecase "View INS Forms\n(Schedule View)" as UC_INS
  usecase "Select Semester /\nAcademic Term" as UC_Term
  usecase "Switch INS Tab\n(Faculty / Section / Room)" as UC_InsTab

  usecase "Manage Evaluator Schedule\n(Plot & Assign)" as UC_Evaluator
  usecase "Add / Update / Remove\nSchedule Entry" as UC_EditEntry
  usecase "Run Campus-Wide\nConflict Check" as UC_Conflict
  usecase "Apply Suggested\nAlternative Slot" as UC_Suggest
  usecase "Submit Load-Policy\nJustification" as UC_Justify

  usecase "Manage Faculty Profiles" as UC_FacultyProfile
  usecase "Manage Subject Codes" as UC_SubjectCodes
  usecase "Access Campus Navigation" as UC_CampusNav
  usecase "View Profile /\nManage Account" as UC_Profile
}

Chairman -- UC_Login
Chairman -- UC_Dashboard
Chairman -- UC_INS
Chairman -- UC_Evaluator
Chairman -- UC_FacultyProfile
Chairman -- UC_SubjectCodes
Chairman -- UC_CampusNav
Chairman -- UC_Profile

UC_INS ..> UC_Term : <<include>>
UC_INS ..> UC_InsTab : <<include>>

UC_Evaluator ..> UC_EditEntry : <<include>>
UC_Evaluator ..> UC_Conflict : <<include>>
UC_Suggest ..> UC_Conflict : <<extend>>
UC_Justify ..> UC_Evaluator : <<extend>>
@enduml
```

**Notes aligned to the current system implementation**

- The Chairman’s plotted schedule entries are saved to the centralized **`ScheduleEntry`** repository (not a separate “draft inbox” storage).

**UI screenshots (immediately after the diagram):**

![Chairman dashboard — /chairman/dashboard](docs/screenshots/chairman-dashboard.png)

![INS forms — /chairman/ins/faculty](docs/screenshots/chairman-ins.png)

![Evaluator — /chairman/evaluator](docs/screenshots/chairman-evaluator.png)

---

### College Admin — Use Case Diagram

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "College Admin" as College

rectangle "OptiCore (College Admin)" {
  usecase "Log In" as UC_Login
  usecase "View College Dashboard" as UC_Dashboard

  usecase "View INS Forms\n(Schedule View)" as UC_INS
  usecase "Select Semester /\nAcademic Term" as UC_Term
  usecase "Switch INS Tab\n(Faculty / Section / Room)" as UC_InsTab

  usecase "View Central Hub Evaluator\n(College Scope)" as UC_Hub
  usecase "Run Conflict Check\n(Campus-Wide Scan for Term)" as UC_Conflict
  usecase "Apply Suggested\nAlternative Slot" as UC_Suggest

  usecase "Review Schedule\nChange Requests" as UC_ChangeReq
  usecase "Approve Schedule Change" as UC_ApproveChange
  usecase "Reject Schedule Change" as UC_RejectChange
  usecase "Notify Instructor\nof Decision" as UC_NotifyInst

  usecase "Review Access Requests" as UC_AccessReq
  usecase "Approve Access Request" as UC_ApproveAccess
  usecase "Reject Access Request" as UC_RejectAccess

  usecase "View Audit Log" as UC_Audit
  usecase "Manage Faculty Profiles" as UC_FacultyProfile
  usecase "Manage Subject Codes" as UC_SubjectCodes
  usecase "Access Campus Navigation" as UC_CampusNav
  usecase "View Profile /\nManage Account" as UC_Profile
}

College -- UC_Login
College -- UC_Dashboard
College -- UC_INS
College -- UC_Hub
College -- UC_ChangeReq
College -- UC_AccessReq
College -- UC_Audit
College -- UC_FacultyProfile
College -- UC_SubjectCodes
College -- UC_CampusNav
College -- UC_Profile

UC_INS ..> UC_Term : <<include>>
UC_INS ..> UC_InsTab : <<include>>

UC_Hub ..> UC_Conflict : <<include>>
UC_Suggest ..> UC_Conflict : <<extend>>

UC_ChangeReq ..> UC_Conflict : <<include>>
UC_ApproveChange ..> UC_ChangeReq : <<extend>>
UC_RejectChange ..> UC_ChangeReq : <<extend>>
UC_NotifyInst ..> UC_ChangeReq : <<include>>

UC_ApproveAccess ..> UC_AccessReq : <<extend>>
UC_RejectAccess ..> UC_AccessReq : <<extend>>
@enduml
```

**Notes aligned to the current system implementation**

- Schedule approvals (change requests) update the centralized schedule data and become visible to other roles on reload / realtime refresh (where enabled).

**UI screenshots (immediately after the diagram):**

![College dashboard — /admin/college](docs/screenshots/college-admin-dashboard.png)

![Central Hub evaluator — /admin/college/evaluator](docs/screenshots/college-admin-hub.png)

![Schedule change requests — /admin/college/schedule-change-requests](docs/screenshots/college-admin-schedule-change-requests.png)

![Access requests — /admin/college/access-requests](docs/screenshots/college-admin-access-requests.png)

---

### GEC Chairman — Use Case Diagram

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "GEC Chairman" as GEC

rectangle "OptiCore (GEC Chairman)" {
  usecase "Log In" as UC_Login
  usecase "View Dashboard" as UC_Dashboard

  usecase "View INS Forms\n(Schedule View)" as UC_INS
  usecase "Select Semester /\nAcademic Term" as UC_Term
  usecase "Switch INS Tab\n(Faculty / Section / Room)" as UC_InsTab

  usecase "Request Vacant-Slot\nEditing Access" as UC_RequestAccess
  usecase "Submit Access Request" as UC_SubmitAccess
  usecase "View Request Status" as UC_Status

  usecase "Manage Vacant GEC Slots\n(Central Hub Evaluator)" as UC_Vacant
  usecase "Select College / Program /\nSection" as UC_SelectScope
  usecase "Add Vacant GEC\nSlot Row" as UC_AddRow
  usecase "Edit Vacant GEC\nSlot Assignment" as UC_Edit
  usecase "Run Campus-Wide\nConflict Check" as UC_Conflict
  usecase "Apply Suggested\nAlternative Slot" as UC_Suggest
  usecase "Save Vacant GEC\nSlot Changes" as UC_Save

  usecase "Manage Faculty Profiles" as UC_FacultyProfile
  usecase "Manage Subject Codes" as UC_SubjectCodes
  usecase "Access Campus Navigation" as UC_CampusNav
  usecase "View Profile /\nManage Account" as UC_Profile
}

GEC -- UC_Login
GEC -- UC_Dashboard
GEC -- UC_INS
GEC -- UC_RequestAccess
GEC -- UC_Vacant
GEC -- UC_FacultyProfile
GEC -- UC_SubjectCodes
GEC -- UC_CampusNav
GEC -- UC_Profile

UC_INS ..> UC_Term : <<include>>
UC_INS ..> UC_InsTab : <<include>>

UC_RequestAccess ..> UC_SubmitAccess : <<include>>
UC_Status ..> UC_RequestAccess : <<extend>>

UC_Vacant ..> UC_SelectScope : <<include>>
UC_Vacant ..> UC_AddRow : <<include>>
UC_Vacant ..> UC_Edit : <<include>>
UC_Vacant ..> UC_Conflict : <<include>>
UC_Vacant ..> UC_Save : <<include>>
UC_Suggest ..> UC_Conflict : <<extend>>
@enduml
```

**UI screenshots (immediately after the diagram):**

![GEC dashboard — /admin/gec](docs/screenshots/gec-dashboard.png)

![Request access — /admin/gec/request-access](docs/screenshots/gec-request-access.png)

![Vacant slots — /admin/gec/vacant-slots](docs/screenshots/gec-vacant-slots.png)

---

### DOI Admin (VPAA/DOI) — Use Case Diagram

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false

actor "DOI Admin\n(VPAA/DOI)" as DOI

rectangle "OptiCore (DOI Admin)" {
  usecase "Log In" as UC_Login
  usecase "View Dashboard" as UC_Dashboard

  usecase "View INS Forms\n(Schedule View)" as UC_INS
  usecase "Select Semester /\nAcademic Term" as UC_Term
  usecase "Switch INS Tab\n(Faculty / Section / Room)" as UC_InsTab

  usecase "View Central Hub Evaluator\n(Campus-Wide)" as UC_Hub
  usecase "Run Conflict Check\n(Campus-Wide Scan for Term)" as UC_Conflict
  usecase "Apply Suggested\nAlternative Slot" as UC_Suggest

  usecase "Review Load-Policy\nJustifications" as UC_Reviews
  usecase "View Policy\nViolations" as UC_Violations
  usecase "Approve Justification" as UC_Approve
  usecase "Reject Justification" as UC_Reject

  usecase "Publish and Lock\nSchedules" as UC_PublishLock
  usecase "Lock Schedule Entries\nfor Term" as UC_LockTerm

  usecase "View Audit Log" as UC_Audit
  usecase "Access Campus Navigation" as UC_CampusNav
  usecase "View Profile /\nManage Account" as UC_Profile
}

DOI -- UC_Login
DOI -- UC_Dashboard
DOI -- UC_INS
DOI -- UC_Hub
DOI -- UC_Reviews
DOI -- UC_PublishLock
DOI -- UC_Audit
DOI -- UC_CampusNav
DOI -- UC_Profile

UC_INS ..> UC_Term : <<include>>
UC_INS ..> UC_InsTab : <<include>>

UC_Hub ..> UC_Conflict : <<include>>
UC_Suggest ..> UC_Conflict : <<extend>>

UC_Reviews ..> UC_Violations : <<include>>
UC_Approve ..> UC_Reviews : <<extend>>
UC_Reject ..> UC_Reviews : <<extend>>

UC_PublishLock ..> UC_LockTerm : <<include>>
@enduml
```

**UI screenshots (immediately after the diagram):**

![DOI dashboard — /doi/dashboard](docs/screenshots/doi-dashboard.png)

![DOI evaluator — /doi/evaluator](docs/screenshots/doi-evaluator.png)

![Policy reviews — /doi/reviews](docs/screenshots/doi-policy-reviews.png)

![Schedule hub — /doi/schedule-hub](docs/screenshots/doi-schedule-hub.png)

![Audit log — /doi/audit-log](docs/screenshots/doi-audit-log.png)

---

## 4.4 Data Design

### 4.4.1 Class diagram

The **OptiCore application** will orchestrate browser pages and API routes. The **Central Hub** will not require a separate schedule table: it will **query** the same **`ScheduleEntry`** repository the Chairman populates within scope.

**Core entities:**

- **`College`** aggregates **`Program`**, which aggregates **`Section`**. **`Subject`** belongs to **`Program`**.
- **`User`** associates with **`College`** and, for chairs, optionally **`chairmanProgramId`**. **`FacultyProfile`** composes **1:1** with **`User`** for instructors.
- **`ScheduleEntry`** links **`AcademicPeriod`**, **`Subject`**, instructor **`User`**, **`Section`**, and **`Room`**, with status in {`draft`,`final`,`conflicted`}.
- **`Notification`**, **`WorkflowInboxMessage`**, **`AccessRequest`**, **`AuditLog`**, and **`ScheduleLoadJustification`** support messaging, scoped access, accountability, and load-policy narratives.

**Behavior:** **RLS** will enforce association rules at **runtime** in PostgreSQL, complementing application checks.

### 4.4.2 Database schema (recommended)

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
FacultyProfile (id, userId [unique → User], fullName, aka, degree fields, majors, minors, research, extension, production, specialTraining, status, designation, ratePerHour)
StudentProfile (id, userId [unique], programId, sectionId, yearLevel, createdAt, updatedAt)

-- Scheduling (central repository)
ScheduleEntry (id, academicPeriodId, subjectId, instructorId, sectionId, roomId, day, startTime, endTime, status ∈ draft|final|conflicted)
ScheduleLoadJustification (id, academicPeriodId, collegeId, authorUserId, authorName, authorEmail, justification, violationsSnapshot, createdAt, updatedAt)

-- Workflow & governance
Notification (id, userId, message, isRead, createdAt)
WorkflowInboxMessage (id, senderId, collegeId, fromLabel, toLabel, subject, body, workflowStage, mailFor[], sentFor[], status, createdAt)
AccessRequest (id, requesterId, collegeId, status, scopes[], note, reviewedById, reviewedAt, expiresAt, createdAt, updatedAt)
AuditLog (id, actorId, collegeId, action, entityType, entityId, details jsonb, createdAt)
```

*Apply all migrations in `supabase/migrations/` for indexes, RLS, realtime publication, and triggers.*

---

## 4.5 System Architecture

OptiCore will follow a **three-tier** pattern aligned with Next.js and Supabase:

1. **Presentation tier:** React components, **CampusIntelligenceShell** and **PortalShell**, client-side conflict scanning in evaluator modules, **NotificationBell** and **InboxWorkspace** with optional Realtime.
2. **Application tier:** Next.js **App Router** (server components and route handlers), **API routes** for inbox, access requests, and audit reads; server-only use of Supabase service role where required.
3. **Data tier:** **Supabase PostgreSQL** with **RLS**, **Auth** linked to **`User.id`**, and versioned **migrations**.

Data flow for scheduling will emphasize **write on Chairman path (scoped)** and **read on Central Hub path (by college)** without duplicating master schedule databases per email thread.

---

## 4.6 Performance Requirements

**Software:** The platform will be designed to handle **growth** in users and schedule rows through **indexed** relational storage and **efficient** queries scoped by college and period. **Measurement points** will include: page load perceived as responsive on typical campus networks; evaluator operations (conflict scan, save) completing without prolonged blocking; inbox and notification refresh leveraging **Realtime** where enabled. **Client-side** conflict detection will keep **interaction latency** low for plotting. Server and database tiers will be sized according to **Supabase** and **hosting** plan limits for the pilot.

---

## 4.7 Security and Data Privacy Requirements

### 4.7.1 Authentication

User identity will be established through **Supabase Auth** (email/password or institutional provider as configured). Application **`User`** rows will bind **`User.id`** to **`auth.users`**, enabling consistent subject binding for RLS policies.

### 4.7.2 Authorization

Access to rows will be governed by **PostgreSQL Row Level Security** policies aligned with roles (**chairman_admin**, **college_admin**, **cas_admin**, **gec_chairman**, **doi_admin**, **instructor**, **student**, etc.). **Program** scope for chairs and **college** scope for administrators will restrict reads and writes. **Temporary** privileges will be mediated through **`AccessRequest`** scopes approved by the **College Admin**.

### 4.7.3 RA 10173 (Data Privacy Act of 2012) compliance

Processing of **personal information** (for example names, emails, employee identifiers, and academic assignment data) will observe **principles of transparency**, **legitimate purpose**, and **proportionality**. The system will implement **organizational and technical safeguards** appropriate to a campus scheduling context: **role-based access**, **encryption in transit (HTTPS/TLS)**, **minimization** of sensitive fields in **audit** details, **secure credential** handling via the identity provider, and **retention** practices consistent with institutional policy and Supabase project settings. **Data subjects** (faculty, students, staff) will be able to exercise rights such as **access** and **correction** through **institutional procedures** (for example registrar or IT office), supported by accurate **User** and profile records in the system where maintained. Where **consent** or **notice** is required for specific processing activities, institutional **privacy notices** and **forms** will apply in addition to technical controls. A **Data Protection** mindset will align development with **NPC** guidance and school policy; formal **Data Protection Officer** roles and **Privacy Impact Assessment** documentation will follow **CTU** and national requirements as mandated for the deployment context.

---

## 4.8 Other Non-Functional Requirements

### 4.8.1 Usability

The UI will prioritize **clear navigation**, **consistent** Campus Intelligence and Portal layouts, **readable** tables with horizontal scroll hints on small screens, and **accessible** contrast. **Figure 16** (responsive drawer) will evidence mobile usability goals.

### 4.8.2 Scalability

Horizontal scaling will rely on **stateless** application servers (Next.js) and **managed** database scaling options on Supabase. Schema design will favor **normalized** entities and **indexed** foreign keys for schedule volume growth.

### 4.8.3 Maintainability

The codebase will use **TypeScript** for type safety, **modular** components, **versioned migrations**, and separation of **client** and **server** Supabase usage. Documentation in **`docs/`** will track use cases, interfaces, and screenshot narratives.

### 4.8.4 Portability

The application will remain **browser-based** and **platform-independent** on the client. Deployment will be **portable** across hosting providers that support Node.js and HTTPS, with **environment variables** configuring Supabase endpoints and keys.

---

## 4.9 Software Requirements

### 4.9.1 Programming languages

- **TypeScript** — application and component logic.  
- **SQL** — schema, RLS, and migrations (PostgreSQL).

### 4.9.2 Frameworks and libraries

- **Next.js 15** (App Router), **React 18**.  
- **Tailwind CSS 4** — styling.  
- **Supabase JS** (`@supabase/supabase-js`, `@supabase/ssr`) — auth and data access.  
- **Recharts** — dashboard charts where used.

### 4.9.3 Tools

- **Node.js** — local development and build.  
- **Supabase CLI** — migrations and local database (optional).  
- **Git** — version control.  
- **ESLint** / **Vitest** (as configured) — quality and tests.

---

## 4.10 Operational Requirements and Cost Considerations

**Operations:** The system will require **ongoing** management of **Supabase** (backups, RLS review, auth provider settings), **hosting** (deploy pipeline, HTTPS certificates, environment secrets), **user provisioning** (roles in `User`), and **incident response** for access anomalies. **Training** will cover Chairman plotting, College Admin **access approvals**, GEC **vacant slot** rules, and **inbox** coordination.

**Cost considerations (indicative):** Expenses will include **Supabase** subscription tier (database size, auth, bandwidth), **application hosting** (for example Vercel or equivalent **compute** and **bandwidth**), **domain** and TLS if applicable, and **personnel** time for administration and curriculum data entry. Costs will scale with **user count**, **Realtime** usage, and **storage** of logs and backups; the pilot may begin on **free or low-tier** plans with a **migration path** to production tiers before full campus rollout.

---

*End of draft sections.*
