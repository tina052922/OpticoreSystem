# DOCUMENT 2 — USER ACCEPTANCE TESTING (UAT)

**Capstone Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** TEAM CLUTCHERS
**Build / Version:** Current development build (Night Program integration)
**Testing Date:** August 26, 2026

> Copy each test case block into one page / row of the official UAT Word template.

---

## HOW THESE RESULTS WERE OBTAINED

Testing was carried out on August 26, 2026 with the system running locally — the Express backend on `http://localhost:4000` and the Next.js frontend on `http://localhost:3000`, both confirmed healthy before testing.

Each test case records a **Verification Method** so the panel can see how the result was established:

- **Automated test** — an executed assertion in `opticore-web/lib/scheduling/uat-day-night-verification.test.ts`, run with `npm test`. Full suite: **16 test files, 127 tests, all passing.** `npx tsc --noEmit` exits clean.
- **Live endpoint probe** — an HTTP request issued against the running application.
- **Code inspection** — direct reading of the responsible module.
- **Manual browser session** — a tester operating the user interface.

**Result values used:** *Pass*, *Fail*, or *Not Executed*. "Not Executed" is recorded honestly where a case requires an authenticated browser session that was not available in this pass; those cases must be completed before final sign-off. No case is marked Pass without stated evidence.

---

## TC001 — User Login

**Test Case ID:** TC001
**Capstone Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** TEAM CLUTCHERS
**Title / Business Scenario / Module:** User Login / Authentication and Role-Based Redirect

**Preconditions:**
- The OptiCore web application is running and reachable.
- An approved user account exists with the Chairman role.
- The user is signed out.

**Test Data:**
- Email: chairman.bsit@ctu.edu.ph
- Password: valid account password
- Invalid attempt: chairman.bsit@ctu.edu.ph / wrongpassword

**Steps:**
1. Open the OptiCore landing page and click **Sign in**.
2. Enter valid credentials and click **Sign in**.
3. Confirm the dashboard and sidebar shown after login.
4. Sign out, then attempt to sign in with the invalid password.
5. Request a protected route (`/chairman/evaluator`) directly while signed out.

**Expected Result:**
Valid credentials authenticate and redirect to the Campus Intelligence dashboard for the Chairman role with only that role's menu items. Invalid credentials are rejected with a clear error and no session is created. A protected route requested while signed out redirects to sign-in.

**Verification Method:** Live endpoint probe (steps 1 and 5); steps 2 to 4 not executed.

**Actual Result (Pass / Fail):** **Pass — partially verified**

**Comments / Attachments:**
Route protection confirmed by direct request. The landing page returns HTTP 200 and `/login` returns HTTP 200, while `/chairman/evaluator`, `/campus-navigation`, and `/auth/login` each return HTTP 307 redirects when unauthenticated, so protected routes are correctly closed to anonymous users.
**Still to be completed:** credential validation, the role-based redirect target, and rejection of invalid credentials all require a manual browser session with a real account.

**Tester Name / Date:** Team Clutchers / August 26, 2026

**Panelist's Remarks:**

---

## TC002 — Day Program Plotting (Evaluator)

**Test Case ID:** TC002
**Capstone Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** TEAM CLUTCHERS
**Title / Business Scenario / Module:** Evaluator — Day Program schedule plotting

**Preconditions:**
- The user is logged in as Chairman.
- An active academic period (1st Semester, A.Y. 2026–2027) is selected.
- The Evaluator program switch is set to **Day Program**.

**Test Data:**
- Section: BSIT 3A
- Subject: IT 311 — Systems Integration and Architecture (Lecture)
- Faculty: Gwyneth Alberca
- Room: IT Laboratory 1
- Time: Monday, 8:00 AM – 10:00 AM (2-hour block)

**Steps:**
1. Open **Evaluator** and confirm the program switch shows **Day Program**.
2. Select section BSIT 3A and locate IT 311.
3. Click **Plot**, choose Monday, start 8:00 AM, duration 2 hours.
4. Assign faculty and room, then apply.
5. Save and reload to confirm persistence.

**Expected Result:**
The class occupies Monday 8:00 AM – 10:00 AM. The Day grid covers 7:00 AM – 5:00 PM, Monday to Friday. The entry persists after reload.

**Verification Method:** Automated test — "TC002 — Day Program plotting stays inside the 7:00 AM – 5:00 PM window" (2 assertions, both passing).

**Actual Result (Pass / Fail):** **Pass**

**Comments / Attachments:**
Confirmed that the Day mode exposes exactly ten hourly slots running 07:00 to 17:00 across Monday to Friday, and that an 8:00 AM two-hour block maps to 08:00:00 – 10:00:00 with no shift. This also serves as the regression check that the Night Program work did not alter existing Day behaviour.

**Tester Name / Date:** Team Clutchers / August 26, 2026

**Panelist's Remarks:**

---

## TC003 — Night Program Plotting (Evaluator)

**Test Case ID:** TC003
**Capstone Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** TEAM CLUTCHERS
**Title / Business Scenario / Module:** Evaluator — Night Program plotting and exact time placement

**Preconditions:**
- The user is logged in as Chairman.
- An active academic period is selected.
- The Evaluator program switch is set to **Night Program**.
- Night windows: Monday–Friday 4:00 PM – 10:00 PM; Saturday–Sunday 7:00 AM – 10:00 PM.

**Test Data:**
- Section: BSIT 3A (Night); Subject: IT 311; Faculty: Gwyneth Alberca; Room: IT Laboratory 2
- Time A: Monday, 6:00 PM – 7:00 PM (1 hour)
- Time B: Tuesday, 6:00 PM – 8:00 PM (2 hours)
- Time C: Saturday, 7:00 AM – 9:00 AM (weekend window)

**Steps:**
1. Open **Evaluator** and set the switch to **Night Program**.
2. Plot Time A, apply, and save.
3. Plot Time B, apply, and save.
4. Plot Time C, apply, and save.
5. Reload and compare each block against the selected time.
6. Confirm only Night rows appear in the grid.

**Expected Result:**
Each class sits in exactly the selected slot with no automatic shift to another vacant slot. Weekday grids cover 4:00 PM – 10:00 PM, weekend grids 7:00 AM – 10:00 PM, and only Night entries are shown.

**Verification Method:** Automated test — "TC003 — Night Program plotting keeps the exact selected slot" (4 assertions, all passing). Grid rendering not verified in a browser.

**Actual Result (Pass / Fail):** **Pass — time placement verified; on-screen rendering pending**

**Comments / Attachments:**
This case previously failed. The regression is fixed by `clampPlotStartSlotIndex`, which stops a Night start index being clamped against the shorter ten-slot Day grid.

Confirmed by test: Monday 6:00 PM maps to 18:00:00 – 19:00:00, a two-hour Tuesday block maps to 18:00:00 – 20:00:00, and a two-hour Saturday block maps to 07:00:00 – 09:00:00. None slides to 4:00 PM. Window enforcement is also correct — Monday plotting is rejected at 3:00 PM and accepted from 4:00 PM through 9:00 PM, while Saturday and Sunday accept 7:00 AM.

**Still to be completed:** confirm in a browser that the Evaluator grid draws the block on the 6:00 PM row, since the tests prove the time calculation rather than the rendering.

**Tester Name / Date:** Team Clutchers / August 26, 2026

**Panelist's Remarks:**

---

## TC004 — Conflict Checker (Day vs Night Separation)

**Test Case ID:** TC004
**Capstone Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** TEAM CLUTCHERS
**Title / Business Scenario / Module:** Conflict Checker — faculty availability across Day and Night programs

**Preconditions:**
- The user is logged in as Chairman.
- An active academic period is selected.
- The same faculty member holds one Day class and one Night class.

**Test Data:**
- Faculty: Gwyneth Alberca
- Day entry: Monday, 4:00 PM – 5:00 PM, BSIT 3A, IT Laboratory 1
- Night entry: Monday, 4:00 PM – 5:00 PM, BSIT 3A (Night), IT Laboratory 2

**Steps:**
1. Plot the Day entry in **Day Program** mode and save.
2. Switch to **Night Program** and plot the Night entry at the same weekday and time.
3. Click **Run conflict check (campus-wide)**.
4. Review the conflict results panel.
5. Attempt to save the Night schedule.

**Expected Result:**
No conflict is reported and the Night schedule saves, because Day and Night are separate offerings with separate loads.

**Verification Method:** Automated test — "TC004 — Conflict Checker keeps Day and Night in separate universes" (4 assertions, all passing), plus code inspection of the backend scan.

**Actual Result (Pass / Fail):** **Pass**

**Comments / Attachments:**
This case previously failed with the false message *"Gwyneth Alberca is double-booked: overlaps another assignment on Monday 16:00–17:00."*

Confirmed by test that no conflict is raised across Day and Night on the dense path (`detectConflictsForEntry`), none on the sparse grid path (`detectConflictsSparse`), and none when the Night row is stored with the `Night::` day prefix rather than a `programMode` column. Critically, a fourth assertion confirms a genuine double-booking **within** the same program is still detected, proving the fix separates the two universes rather than disabling conflict checking. Code inspection confirms the backend campus-wide scan in `scheduling.controller.ts` applies the same program-mode rule.

**Note:** a second conflict routine serving the DOI / VPAA queue was found still unfixed during this pass and is covered by the new TC013.

**Tester Name / Date:** Team Clutchers / August 26, 2026

**Panelist's Remarks:**

---

## TC005 — Conflict Checker Time Format

**Test Case ID:** TC005
**Capstone Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** TEAM CLUTCHERS
**Title / Business Scenario / Module:** Conflict Checker — readable time ranges

**Preconditions:**
- The user is logged in as Chairman.
- At least one genuine conflict exists within the same program mode.

**Test Data:**
- Faculty: Gwyneth Alberca
- Two conflicting Night entries: Monday, 4:00 PM – 5:00 PM

**Steps:**
1. Plot two classes for the same faculty member on Monday, 4:00 PM – 5:00 PM, in the same mode.
2. Click **Run conflict check (campus-wide)**.
3. Read the conflict message text.
4. Review the suggested alternative slots.

**Expected Result:**
Messages display readable 12-hour times, for example *"Monday 4:00 PM – 5:00 PM."*

**Verification Method:** Automated test — "TC005 — Conflict messages use readable 12-hour ranges" (1 assertion on the exact rendered string, passing).

**Actual Result (Pass / Fail):** **Pass**

**Comments / Attachments:**
This case previously failed, with messages showing raw values such as *"Monday 16:00–17:00."* The rendered message is now asserted character for character as:

> Gwyneth Alberca is double-booked: overlaps another assignment on Monday 4:00 PM – 5:00 PM.

The test additionally asserts the output contains neither `16:00` nor the internal `Night::` storage prefix, confirming both the time formatting and the prefix stripping.

**Observation for the panel:** the message does not name the program window (Day Program or Night Program). This was suggested in the original finding but is a readability enhancement rather than a defect, and is recorded as such rather than failing the case.

**Tester Name / Date:** Team Clutchers / August 26, 2026

**Panelist's Remarks:**

---

## TC006 — Load Generator / INS Form Print Layout

**Test Case ID:** TC006
**Capstone Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** TEAM CLUTCHERS
**Title / Business Scenario / Module:** Load Generator — INS Form 5A / 5B / 5C preview and print output

**Preconditions:**
- The user is logged in as Chairman.
- An active academic period is selected.
- A faculty member, a section, and a room each have plotted entries, including one slot holding two or more classes.

**Test Data:**
- Faculty: Gwyneth Alberca; Section: BSIT 3A; Room: IT Laboratory 1
- Semester: 1st Semester, A.Y. 2026–2027

**Steps:**
1. Open **Load Generator**.
2. Select the **Faculty** tab and review the preview grid.
3. Select the **Section** tab and review the preview grid.
4. Select the **Room** tab and review the preview grid.
5. Click **Print / Generate INS Form** and inspect each print preview.

**Expected Result:**
Preview and print match the official INS Form layout for Faculty, Section, and Room. Each class occupies one time cell aligned to its correct day column and time row, with course code, year and section, and room on separate readable lines and no overflow.

**Verification Method:** Code inspection. Manual browser session still required.

**Actual Result (Pass / Fail):** **Fail**

**Comments / Attachments:**
Related to BUG-2026-001 and BUG-2026-007.

Inspection shows the current build only contains the overflow: a `max-h-[2.4em]` cap on the truncating cell wrappers in `OpticoreInsDocuments.tsx` and a `max-h-full` cap on the night table cell wrappers. Nothing in the change affects how time rows align to day columns, so the **misaligned cells reported in the original finding remain unaddressed** and the case cannot pass.

Inspection also revealed a more serious problem: all three forms render each cell with `items.slice(0, 2)`, so a third class in the same time cell is silently dropped from both preview and print, with no overflow indicator. A clean-looking but incomplete official form is a worse outcome than visibly overlapping text, and this is filed as BUG-2026-007.

**Still to be completed:** a browser session to confirm the current severity of the overlap and misalignment and to capture screenshots.

**Tester Name / Date:** Team Clutchers / August 26, 2026

**Panelist's Remarks:**

---

## TC007 — INS Search for Night Program

**Test Case ID:** TC007
**Capstone Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** TEAM CLUTCHERS
**Title / Business Scenario / Module:** Load Generator — INS search filtered by program mode

**Preconditions:**
- The user is logged in as Chairman or College Admin.
- An active academic period is selected.
- The same faculty and section have entries in both programs.

**Test Data:**
- Search terms: "Alberca", then "BSIT 3A"
- Program mode under test: Night Program

**Steps:**
1. Open **Load Generator** and set the mode to **Night Program**.
2. Search "Alberca" and review the results.
3. Open a matching result and check the listed classes and times.
4. Repeat with "BSIT 3A".
5. Switch to **Day Program** and repeat for comparison.

**Expected Result:**
Night mode returns Night records only and Day mode returns Day records only. Neither returns records from the other offering.

**Verification Method:** Automated test — "TC007 — Search and listings filter by the selected program" (2 assertions, both passing).

**Actual Result (Pass / Fail):** **Pass — filtering verified; INS Form output pending**

**Comments / Attachments:**
This case previously failed. Confirmed by test that `filterByProgramMode` returns only Night rows in Night mode and only Day rows in Day mode. The test deliberately includes a row tagged by the `programMode` column, a row tagged only by the `Night::` day prefix, and a legacy untagged row, and all three are classified correctly — so separation holds whether or not the database has the `programMode` column.

**Still to be completed:** confirm in a browser that an INS Form opened from a Night search result contains no Day Program classes, which is the part of the original finding that operates beyond this filter.

**Tester Name / Date:** Team Clutchers / August 26, 2026

**Panelist's Remarks:**

---

## TC008 — Schedule Change Request Approval

**Test Case ID:** TC008
**Capstone Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** TEAM CLUTCHERS
**Title / Business Scenario / Module:** Schedule Change Request — submission, review, and approval

**Preconditions:**
- A faculty account and a College Admin account both exist and are approved.
- The faculty member has at least one published class in the active period.

**Test Data:**
- Requesting faculty: Gwyneth Alberca
- Affected class: IT 311, BSIT 3A, Monday 8:00 AM – 10:00 AM
- Requested change: move to Wednesday 8:00 AM – 10:00 AM
- Reason: "Conflict with a scheduled department meeting."

**Steps:**
1. Log in as the faculty member and open **My schedule**.
2. Submit a change request with the new slot and reason.
3. Log in as College Admin and open **Schedule change requests**.
4. Open the pending request and click **Approve**.
5. Log back in as the faculty member and confirm the updated schedule and notification.

**Expected Result:**
The request appears in the College Admin queue as Pending. Approval updates the status, records the change, writes an audit log entry, and notifies the requesting faculty member.

**Verification Method:** Requires a manual browser session with two accounts.

**Actual Result (Pass / Fail):** **Not Executed**

**Comments / Attachments:**
Not executed in this pass because it needs authenticated sessions for two different roles. Supporting routes exist in the backend (`/schedule-change`, `/notifications`, `/audit`) and the College Admin navigation exposes the queue, but the workflow itself has not been exercised and no result should be claimed. Must be completed before sign-off.

**Tester Name / Date:** Team Clutchers / August 26, 2026

**Panelist's Remarks:**

---

## TC009 — Config Signatories on INS Print

**Test Case ID:** TC009
**Capstone Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** TEAM CLUTCHERS
**Title / Business Scenario / Module:** System Configuration — signatory labels on printed INS Forms

**Preconditions:**
- The user is logged in as College Admin or DOI / VPAA with System Configuration access.
- An INS Form can be generated for the active period.

**Test Data:**
- Prepared by: Program Chairman, BSIT
- Recommending approval: Dean, College of Technology
- Approved by: Vice President for Academic Affairs
- Noted by: Director of Instruction

**Steps:**
1. Open **System Configuration** and go to INS signatory settings.
2. Update the signatory names and position labels.
3. Save the configuration.
4. Open **Load Generator**, generate an INS Form, and open the print preview.
5. Verify the signatory block at the foot of the form.

**Expected Result:**
Updated names and labels are saved and appear in the signatory block in the correct order and placement.

**Verification Method:** Requires a manual browser session.

**Actual Result (Pass / Fail):** **Not Executed**

**Comments / Attachments:**
Not executed in this pass. The supporting components exist (`InsSignerLabelsEditor.tsx`, `lib/ins/ins-signature-slots.ts`, `SystemConfigurationClient.tsx`), but presence of code is not evidence of correct behaviour and no result is claimed. Must be completed before sign-off.

**Tester Name / Date:** Team Clutchers / August 26, 2026

**Panelist's Remarks:**

---

## TC010 — JSON Coerce Error

**Test Case ID:** TC010
**Capstone Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** TEAM CLUTCHERS
**Title / Business Scenario / Module:** Evaluator — Save Schedule request validation and error handling

**Preconditions:**
- The user is logged in as Chairman with edit rights.
- An active academic period is selected and the schedule is not yet published.
- Several rows are plotted, including one with a blank numeric field.

**Test Data:**
- Section: BSIT 3A; Subject: IT 311; Faculty: Gwyneth Alberca; Room: IT Laboratory 1
- Students field: left blank
- Time: Monday, 6:00 PM – 7:00 PM (Night Program)

**Steps:**
1. Plot three or more classes, leaving the Students field blank on one row.
2. Click **Save schedule**.
3. Read the on-screen message.
4. Inspect the browser console and the Network tab.
5. Reload and compare the grid against stored records.

**Expected Result:**
Valid rows are saved. An invalid field yields a structured JSON error naming the field and row, and the interface shows a specific readable message. The grid always matches stored records after reload.

**Verification Method:** Attempted code inspection; reproduction requires a manual browser session.

**Actual Result (Pass / Fail):** **Not Executed — could not reproduce**

**Comments / Attachments:**
Related to BUG-2026-005. A search of both code bases found only one `z.coerce` usage, in `opticore-backend/src/config/env.ts` for the `PORT` variable, which is unrelated to schedule saving. No coercion schema was located on the schedule-entries write path, so the reported error could not be traced by inspection alone.

**Action required:** on the next occurrence, capture the exact toast message, the full console output, and the failing request and response body from the Network tab. Without that evidence the underlying defect cannot be diagnosed, and this case should not be reported as either a pass or a confirmed failure.

**Tester Name / Date:** Team Clutchers / August 26, 2026

**Panelist's Remarks:**

---

## TC011 — Campus Intelligence Dashboard

**Test Case ID:** TC011
**Capstone Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** TEAM CLUTCHERS
**Title / Business Scenario / Module:** Campus Intelligence Dashboard — analytics, counts, and utilization

**Preconditions:**
- The user is logged in as Chairman or College Admin.
- An active academic period with plotted schedules is selected.

**Test Data:**
- Semester: 1st Semester, A.Y. 2026–2027
- College: College of Technology; Department: Information Technology

**Steps:**
1. Open **Campus Intelligence**.
2. Review the summary cards for sections, faculty, rooms, and plotted classes.
3. Review faculty load distribution and room utilization.
4. Change the semester filter and confirm the figures refresh.
5. Cross-check two figures against the Evaluator and Load Generator records.

**Expected Result:**
Cards and charts show accurate counts, load figures, utilization, and conflict indicators for the selected scope, matching the underlying records, and refresh correctly when filters change.

**Verification Method:** Requires a manual browser session with data.

**Actual Result (Pass / Fail):** **Not Executed**

**Comments / Attachments:**
Not executed in this pass. Note for the tester: `lib/server/campus-intelligence-stats.ts` resolves each entry's program mode when aggregating faculty load, so the Day and Night breakdown should be checked explicitly against the Evaluator totals rather than assumed correct.

**Tester Name / Date:** Team Clutchers / August 26, 2026

**Panelist's Remarks:**

---

## TC012 — Campus Navigation

**Test Case ID:** TC012
**Capstone Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** TEAM CLUTCHERS
**Title / Business Scenario / Module:** Campus Navigation — building and room search with route guidance

**Preconditions:**
- The user is logged in, or is viewing the public navigation page.
- Building and room location data are loaded.

**Test Data:**
- Search terms: "IT Laboratory 1", then "Registrar's Office"
- Building: Technology Building

**Steps:**
1. Open **Campus navigation**.
2. Search "IT Laboratory 1".
3. Select the result and review the highlighted map location.
4. Review the building, floor, and direction details.
5. Repeat for "Registrar's Office" and confirm the map updates.

**Expected Result:**
The search returns the matching room or facility, the map highlights the correct location, details are accurate, and selecting a new result updates the map without a page reload.

**Verification Method:** Requires a manual browser session.

**Actual Result (Pass / Fail):** **Not Executed**

**Comments / Attachments:**
Not executed in this pass. The route responds (HTTP 307 redirect to sign-in when anonymous, confirming it is wired and protected), and unit coverage exists for the underlying catalog in `lib/campus/campus-navigation-catalog.test.ts` and `campus-navigation-room-dedupe.test.ts`, but the map interface itself has not been exercised.

**Tester Name / Date:** Team Clutchers / August 26, 2026

**Panelist's Remarks:**

---

## TC013 — DOI / VPAA Conflict Queue (Day vs Night Separation)

**Test Case ID:** TC013
**Capstone Project Title:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** TEAM CLUTCHERS
**Title / Business Scenario / Module:** DOI / VPAA — Schedule Conflicts queue

**Preconditions:**
- A DOI / VPAA account can reach the schedule conflicts queue.
- An academic period contains a faculty member with a Day class and a Night class at overlapping times.
- A second faculty member has two same-program classes overlapping across single-digit and double-digit hours.

**Test Data:**
- Cross-program pair: Gwyneth Alberca, Monday 4:00 PM – 5:00 PM Day and Monday 4:00 PM – 5:00 PM Night
- Missed-overlap pair: Monday 9:00 AM – 11:00 AM and Monday 10:00 AM – 12:00 NN, same program

**Steps:**
1. Log in as DOI / VPAA.
2. Open the schedule conflicts view for the academic period.
3. Confirm the cross-program pair is not reported as a conflict.
4. Confirm the same-program overlapping pair **is** reported.
5. Confirm the reported times are readable 12-hour ranges.

**Expected Result:**
Cross-program overlaps are not reported. Genuine same-program overlaps are reported at any hour, including single-digit hours, with readable 12-hour times.

**Verification Method:** Code inspection before and after correction; backend restart and health check. Manual browser session still required.

**Actual Result (Pass / Fail):** **Pass — corrected during testing; awaiting confirmation in the queue interface**

**Comments / Attachments:**
Added after this case was discovered during verification of TC004. `getScheduleConflicts` in `doi-extra.controller.ts` had never been updated for the Day / Night work: it compared all entry pairs with no program-mode filter, so the false double-booking still reached the VPAA queue even after the Evaluator was fixed.

The same routine also compared times as text. Because `"9:00" >= "10:00"` is true in string comparison, genuine overlaps involving single-digit hours were silently missed — the opposite failure, where a real conflict goes unreported.

Both faults were corrected: the endpoint now filters by program mode, normalizes the `Night::` prefix, compares times as numeric minutes, and reports readable 12-hour ranges. The change type-checks cleanly and the backend restarts healthy. See BUG-2026-006.

**Tester Name / Date:** Team Clutchers / August 26, 2026

**Panelist's Remarks:**

---

## UAT SUMMARY

| Test Case ID | Module / Scenario | Result | Verification Method | Related Bug |
|---|---|---|---|---|
| TC001 | User Login / Authentication | Pass (partial) | Live endpoint probe | — |
| TC002 | Day Program Plotting (Evaluator) | Pass | Automated test | — |
| TC003 | Night Program Plotting (Evaluator) | Pass (rendering pending) | Automated test | BUG-2026-003 |
| TC004 | Conflict Checker — Day vs Night Separation | Pass | Automated test + code inspection | BUG-2026-002 |
| TC005 | Conflict Checker Time Format | Pass | Automated test | BUG-2026-004 |
| TC006 | Load Generator / INS Form Print Layout | **Fail** | Code inspection | BUG-2026-001, BUG-2026-007 |
| TC007 | INS Search for Night Program | Pass (INS output pending) | Automated test | BUG-2026-003 |
| TC008 | Schedule Change Request Approval | Not Executed | — | — |
| TC009 | Config Signatories on INS Print | Not Executed | — | — |
| TC010 | JSON Coerce Error | Not Executed (not reproduced) | Attempted code inspection | BUG-2026-005 |
| TC011 | Campus Intelligence Dashboard | Not Executed | — | — |
| TC012 | Campus Navigation | Not Executed | — | — |
| TC013 | DOI / VPAA Conflict Queue | Pass (queue view pending) | Code inspection | BUG-2026-006 |

**Total test cases:** 13
**Passed:** 6 (TC001 partial, TC002, TC003, TC004, TC005, TC007, TC013 — of which TC001, TC003, TC007, and TC013 carry a stated residual check)
**Failed:** 1 (TC006)
**Not Executed:** 5 (TC008, TC009, TC010, TC011, TC012)

**Overall UAT status:** Not yet complete. The Day / Night defects that dominated the original findings are fixed and evidenced, but five cases still require a manual browser session and TC006 remains a genuine failure. Final sign-off should be withheld until the outstanding cases are executed and TC006 is retested.

---

## OUTSTANDING WORK BEFORE SIGN-OFF

1. Execute TC008, TC009, TC011, and TC012 in a browser with real accounts.
2. Reproduce TC010 and capture the console output and Network response body, or formally close BUG-2026-005 as not reproducible.
3. Fix the INS Form cell alignment and the two-entry cell cap, then retest TC006.
4. Confirm in a browser the residual checks noted on TC001 (credential validation), TC003 (grid rendering), TC007 (INS Form contents), and TC013 (queue interface).
5. Confirm any retest runs against the restored build, since the fixes were briefly reverted in the working copy during development.
