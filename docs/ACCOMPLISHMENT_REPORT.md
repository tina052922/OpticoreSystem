# DOCUMENT 3 — ACCOMPLISHMENT REPORT

**Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** Team Clutchers
**Reporting Period:** Development and internal testing up to August 26, 2026
**Build / Version:** Current development build (Night Program integration)

---

## 1. PROJECT OVERVIEW

OptiCore is a web-based Campus Intelligence System that centralizes academic scheduling, faculty loading, and room navigation for the campus. It replaces the manual, spreadsheet-based preparation of Individual Notice of Schedule (INS) forms with a guided workflow that plots class schedules, detects conflicts, generates official load documents, and routes schedules through the proper approving authorities.

The system serves multiple roles with scoped access: Chairman, College Admin, CAS Admin, GEC Chairman, Director of Instruction / VPAA, and Instructor. Each role sees only the modules and data within its authority. The platform is built on Next.js 15 for the web application with an Express API layer for secured operations, and Supabase for data persistence, authentication, and realtime updates.

The current reporting period focused on completing the core scheduling workflow and integrating the **Night Program** as a second, independent offering alongside the existing Day Program.

---

## 2. MAJOR ACCOMPLISHMENTS

**2.1 Evaluator (Scheduling Worksheet)**
- Interactive weekly grid for plotting class schedules per section, with drag-free click-to-plot and a guided plotting modal.
- Prospectus-driven subject worksheet that lists required subjects, units, and lecture / laboratory hours per curriculum year.
- Faculty and room assignment with availability awareness and automatic duration handling for multi-hour blocks.
- Central Hub Evaluator variants for College Admin, CAS Admin, GEC Chairman, and DOI, providing campus-wide visibility with college, department, and section filters.

**2.2 Load Generator / INS Forms**
- Generation of the official INS documents in three variants: Form 5A (Faculty load), Form 5B (Section schedule), and Form 5C (Room utilization).
- Print-ready output with the official header, academic period details, and configurable signatory block.
- Search and filter tools for locating a faculty member, section, or room and generating the corresponding load sheet.

**2.3 Night Program Mode**
- Introduced the Night Program as a distinct offering with its own time windows: Monday–Friday 4:00 PM – 10:00 PM and Saturday–Sunday 7:00 AM – 10:00 PM.
- Added a Day / Night program switch inside the Evaluator, with the selected mode persisted across sessions.
- Extended the scheduling grid to render the correct time range and day set for each mode.

**2.4 Conflict Checker**
- Automated detection of faculty double-booking, room double-booking, and section overlaps.
- Campus-wide conflict scan available from the Evaluator, with per-row highlighting and suggested alternative slots.

**2.5 GEC Workflow**
- General Education Curriculum distribution module for allocating GEC subjects across colleges.
- Inbox and acknowledgement flow for receiving colleges, with vacant GEC cells highlighted in the scheduling grids.

**2.6 Policy Justification and Review**
- Policy review queues for College Admin and the VPAA / DOI, allowing schedules that exceed policy thresholds to proceed only with a recorded written justification.
- Decision trail retained for each reviewed item.

**2.7 Schedule Change Requests**
- Faculty-initiated request workflow for moving or amending a published class, with a review and approval queue for College Admin.

**2.8 Realtime and Notifications**
- Realtime updates over a server-sent events channel so that schedule and queue changes propagate without a manual refresh.
- In-app notification center with unread badges for pending requests, approvals, and distributions.

**2.9 Campus Intelligence Dashboard**
- Role-scoped analytics covering section counts, faculty counts, room counts, plotted classes, faculty load distribution, room utilization, and conflict indicators.
- Semester, college, and department filters for narrowing the reported scope.

**2.10 Campus Navigation**
- Searchable directory of buildings, rooms, and campus facilities with map highlighting and building, floor, and direction details.

**2.11 Access Control, Audit, and System Configuration**
- Role-based authentication with an access-request and approval process for new accounts.
- Audit log recording key administrative actions with actor, action, and timestamp.
- System Configuration module for academic periods, INS signatory labels, and scheduling policy parameters.

**2.12 Deployment and Infrastructure**
- Web application deployed to Vercel with the Express API layer handling secured operations and Supabase service-role access kept strictly server-side.
- Repository structure separated into `opticore-web` (frontend) and `opticore-backend` (API), with automated type checks and unit tests.

---

## 3. TESTING SUMMARY

Quality assurance was carried out by Team Clutchers in two stages: manual testing of the running system, followed by a verification pass on August 26, 2026 with the backend and frontend running locally.

- **User Acceptance Testing:** Thirteen test cases (TC001 to TC013) cover authentication, Day and Night plotting, conflict checking and message formatting, Load Generator print layout, INS search, schedule change request approval, signatory configuration, schedule save error handling, the Campus Intelligence dashboard, campus navigation, and the DOI / VPAA conflict queue. TC013 was added after a defect was discovered during verification.
- **Automated regression evidence:** An executable suite was written for the Day / Night behaviour at `opticore-web/lib/scheduling/uat-day-night-verification.test.ts`. The full project suite passes with **127 tests across 16 test files**, and `npx tsc --noEmit` on the frontend exits clean.
- **Results:** 6 cases pass with stated evidence, 1 fails (TC006, INS Form print layout), and 5 remain not executed because they require an authenticated browser session. Results are recorded honestly as Pass, Fail, or Not Executed, and no case is marked Pass without evidence.
- **Bug Report:** Nine defects are documented as BUG-2026-001 through BUG-2026-009. Five originated from manual testing; four were discovered during the verification pass.
- **Concentration of defects:** The defects cluster in the newly integrated Night Program and the INS output layer. Core Day Program behaviour was explicitly regression-tested and is unaffected.
- **Overall status:** Not yet signed off. The Day / Night defects that dominated the original findings are fixed and evidenced, but TC006 remains a genuine failure and five cases still require execution.

---

## 4. OPEN ISSUES / BUGS FOUND

| Bug ID | Module | Summary | Severity | Priority | Status |
|---|---|---|---|---|---|
| BUG-2026-001 | Load Generator (INS Forms 5A / 5B / 5C) | INS Form preview and print layout broken — overlapping text and misaligned time cells | High | High | Open — partially mitigated |
| BUG-2026-002 | Conflict Checker (Evaluator) | False faculty double-booking between a Day Program load and a Night Program load | Critical | High | Resolved — pending retest |
| BUG-2026-003 | Scheduling Core — Day / Night separation | Day and Night data mix across plotting, conflict checking, INS Forms, and search | Critical | High | Resolved except INS output |
| BUG-2026-004 | Conflict Checker — time display | Conflict messages used 24-hour times instead of readable ranges | Medium | Medium | Resolved — pending retest |
| BUG-2026-005 | Evaluator — Save Schedule (API) | JSON coerce error on schedule save | High | High | Open — unable to reproduce |
| BUG-2026-006 | DOI / VPAA — Schedule Conflicts endpoint | Endpoint mixed Day and Night loads and missed overlaps due to text time comparison | Critical | High | Resolved — pending retest |
| BUG-2026-007 | Load Generator — INS cell rendering | Time cell shows at most two classes and silently drops any third | High | High | Open |
| BUG-2026-008 | Backend build configuration | `tsconfig.json` and lockfile were gitignored; build and start both failed | High | High | Resolved |
| BUG-2026-009 | GEC — Section Plotting Table | Import name mismatch broke the frontend TypeScript build | Critical | High | Resolved |

**Summary:** 9 defects — 4 Critical, 4 High, 1 Medium. Three remain open (BUG-001, BUG-005, BUG-007) and six are resolved, of which four await user acceptance retest.

The Critical defects share one root cause: Day and Night records were not treated as independent datasets. That has now been corrected in the Evaluator, the conflict checker, the search filters, and the DOI / VPAA queue, with automated tests confirming that genuine same-program conflicts are still detected.

Two of the newly discovered defects deserve particular attention. BUG-2026-007 means an official load sheet can print as clean and complete while silently omitting a class, which is more dangerous than the visible overlap originally reported. BUG-2026-008 means the backend cannot be type-checked or built, so type errors can reach production undetected.

---

## 5. NEXT STEPS

1. **Rebuild the Load Generator / INS Form layout (BUG-2026-001 — High).** Align the time rows with the day columns so entries appear beside the correct time label. The current build only caps cell overflow, which contains the overlapping text but leaves the misalignment untouched.
2. **Remove the two-entry cell cap (BUG-2026-007 — High).** Render every class in a time cell, or display an explicit overflow indicator. A printed load sheet must never silently omit a class.
3. **Adopt the restored backend type check (BUG-2026-008 — Resolved).** The compiler configuration and lockfile are now tracked and the build works again; add the backend type check to the routine quality gate so type errors are caught before deployment.
4. **Resolve or close the schedule save error (BUG-2026-005 — High).** Capture the console output and the failing Network response on the next occurrence. If it cannot be reproduced with evidence, close the item formally rather than carrying it as an unverified defect.
5. **Complete the outstanding UAT cases.** Execute TC008, TC009, TC011, and TC012 in a browser with real accounts, and confirm the residual checks recorded on TC001, TC003, TC007, and TC013.
6. **Retest and close the fixed defects.** Confirm BUG-2026-002, BUG-2026-003, BUG-2026-004, and BUG-2026-006 in the user interface, then move them from Resolved to Closed and finalize UAT sign-off.
7. **Strengthen the development process.** The Day / Night fixes were briefly lost from the working copy while remaining staged in Git, and a renamed helper left a build-breaking import that only a type check caught. Commit verified work promptly and run the type check and test suite before each push.
8. **Prepare for panel evaluation.** Consolidate the updated UAT results, the Bug Report, and the final documentation for submission and defense.

---

## 6. PREPARED BY

**Team Clutchers**
Capstone Project: OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
Date: August 26, 2026

| Role | Name | Signature | Date |
|---|---|---|---|
| Team Leader | ______________________ | ______________________ | ____________ |
| Member | ______________________ | ______________________ | ____________ |
| Member | ______________________ | ______________________ | ____________ |
| Member | ______________________ | ______________________ | ____________ |

**Noted by:**

| Role | Name | Signature | Date |
|---|---|---|---|
| Capstone Adviser | ______________________ | ______________________ | ____________ |
| Panel Chair | ______________________ | ______________________ | ____________ |
