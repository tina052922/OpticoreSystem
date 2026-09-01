# DOCUMENT 1 — BUG REPORT

**Project / System:** OptiCore: A Campus Intelligence System for Academic Scheduling and Room Navigation
**Team:** Team Clutchers
**Build / Version:** Current development build (Evening Program integration)
**Date Prepared:** August 26, 2026
**Date Verified:** August 26, 2026

> Copy each block below into one row of the official Excel Bug Report Form.

---

## VERIFICATION NOTE (read before filling the form)

Bugs BUG-2026-001 to BUG-2026-005 came from manual testing of the running system. On August 26, 2026 the team re-verified each one against the code base with the backend and frontend running locally (`http://localhost:4000` and `http://localhost:3000`).

Verification used three methods:

- **Automated test evidence** — an executable suite at `opticore-web/lib/scheduling/uat-day-night-verification.test.ts`, run with `npm test`. Full suite result: **16 test files, 127 tests, all passing.** TypeScript check `npx tsc --noEmit` exits clean.
- **Code inspection** — reading the responsible modules to confirm the defect is or is not still present.
- **Live endpoint probe** — HTTP requests against the running servers.

Where re-verification changed a bug's state, the **Status** field says so and a **Verification** field records the evidence. Four additional defects found during verification are filed as BUG-2026-006 to BUG-2026-009.

---

## BUG-2026-001

| Field | Value |
|---|---|
| **Bug ID** | BUG-2026-001 |
| **Date Reported** | August 26, 2026 |
| **Reported By** | Team Clutchers (QA) |
| **Project / System** | OptiCore: Campus Intelligence System |
| **Module / Feature** | Load Generator (INS Form 5A Faculty / 5B Section / 5C Room) |
| **Build / Version** | Current development build (Night Program integration) |
| **Severity** | High |
| **Priority** | High |
| **Status** | **Open — partially mitigated** |
| **Reproducibility** | Always |
| **Environment** | Web browser (Chrome / Edge), Next.js 15 + Supabase, Express API |

**Bug Summary:** Load Generator / INS Form preview layout is broken — overlapping text and misaligned time cells.

**Description:**
The Load Generator preview and its print output do not match the official CTU INS Form layout. Course code, year and section, and room text overlap inside a single time cell when a slot holds more than one class, and time-slot cells are misaligned against the day columns so a class appears beside the wrong time label. The defect affects Form 5A (Faculty), Form 5B (Section), and Form 5C (Room) and carries into the printed copy, making the generated load sheet unusable as an official document.

**Preconditions:**
- A user with Chairman, College Admin, GEC Chairman, DOI, or Faculty access is logged in.
- An active academic period is selected.
- At least one section has plotted entries, including a time slot holding two or more classes.

**Steps to Reproduce:**
1. Log in as Chairman and select the active semester.
2. Open **Load Generator**.
3. Select the **Faculty** tab and choose a faculty member with a full teaching load.
4. Observe the weekly grid in the preview panel.
5. Repeat for the **Section** and **Room** tabs.
6. Click **Print / Generate INS Form** and inspect the print preview.

**Expected Result:**
Preview and print match the official INS Form layout. Each class occupies one time cell aligned to its correct day column and time row, with course code, year and section, and room on separate readable lines and no text spilling outside the cell borders.

**Actual Result:**
Text from multiple classes overlaps and overflows the cell borders, and time rows do not line up with the day columns. The printed form is not readable and does not match the official format.

**Test Data:**
- Semester: 1st Semester, A.Y. 2026–2027
- Faculty: Gwyneth Alberca
- Section: BSIT 3A
- Room: IT Laboratory 1

**Evidence / Attachments:** Screenshots of the Load Generator preview (Faculty / Section / Room) and the browser print preview.

**Console / Error Message:** None (visual / layout defect only).

**Initial Analysis:**
Stacked entries render inside a fixed-height table cell with no height cap, so multiple entries overflow. Row spanning for multi-hour classes is computed from a slot index that does not match the rendered row order, producing the misalignment.

**Verification (August 26, 2026):**
Only partially addressed. The current build adds a `max-h-[2.4em]` cap to the truncating cell wrappers in `OpticoreInsDocuments.tsx` (Forms 5A, 5B, 5C) and a `max-h-full` cap to the night table cell wrappers in `OpticoreInsNightScheduleTable.tsx`. These contain the vertical overflow but do not change how rows and columns are aligned, so the **cell misalignment reported in this bug is not addressed**. The remaining visual behaviour requires confirmation in a browser and has not yet been signed off. A related defect discovered during this inspection is filed separately as BUG-2026-007.

**Suspected Component:** `components/ins/ins-layout/OpticoreInsDocuments.tsx`, `components/ins/ins-layout/OpticoreInsNightScheduleTable.tsx`, `components/ins/ins-layout/OpticoreInsScheduleTable.tsx`, and the INS PDF grid adapters.

---

## BUG-2026-002

| Field | Value |
|---|---|
| **Bug ID** | BUG-2026-002 |
| **Date Reported** | August 26, 2026 |
| **Reported By** | Team Clutchers (QA) |
| **Project / System** | OptiCore: Campus Intelligence System |
| **Module / Feature** | Conflict Checker (Evaluator — Timetabling & Optimization) |
| **Build / Version** | Current development build (Night Program integration) |
| **Severity** | Critical |
| **Priority** | High |
| **Status** | **Resolved — pending user acceptance retest** |
| **Reproducibility** | Always (before fix) |
| **Environment** | Web browser (Chrome / Edge), Next.js 15 + Supabase, Express API |

**Bug Summary:** Conflict Checker reports a false faculty double-booking between a Day Program load and a Night Program load.

**Description:**
The Conflict Checker raised a faculty double-booking for an instructor who was actually available. When a faculty member held a Day Program class and a Night Program class on the same weekday at an overlapping clock time, the system treated both as one schedule and flagged a conflict, reporting *"Gwyneth Alberca is double-booked: overlaps another assignment on Monday 16:00–17:00."* Day and Night are separate offerings with separate enrolment and separate loads, so an overlap between them is not a real conflict. Because the checker blocks saving until conflicts are cleared, this prevented legitimate Night Program schedules from being saved.

**Preconditions:**
- User is logged in as Chairman with a program in scope.
- An active academic period is selected.
- The same faculty member is assigned to both a Day and a Night class.

**Steps to Reproduce:**
1. Log in as Chairman and select the active semester.
2. Open **Evaluator** and set the program switch to **Day Program**.
3. Plot a class for Gwyneth Alberca on Monday, 4:00 PM – 5:00 PM, and save.
4. Switch the program switch to **Night Program**.
5. Plot a class for the same faculty member on Monday, 4:00 PM – 5:00 PM.
6. Click **Run conflict check (campus-wide)**.

**Expected Result:**
No conflict is reported. Day and Night loads are evaluated in separate conflict universes, so the overlapping clock time is allowed and the schedule saves.

**Actual Result (as originally reported):**
A faculty double-booking was reported, the Night row was highlighted as conflicting, and **Save schedule** was blocked.

**Test Data:**
- Faculty: Gwyneth Alberca
- Day entry: Monday, 4:00 PM – 5:00 PM, BSIT 3A, IT Laboratory 1
- Night entry: Monday, 4:00 PM – 5:00 PM, BSIT 3A (Night), IT Laboratory 2

**Evidence / Attachments:** Original screenshots of the Evaluator grid and Conflict Check results panel; current automated test output.

**Console / Error Message:** None; shown as an in-application validation message.

**Initial Analysis:**
Overlap detection compared only academic period, calendar day, and time interval, without comparing the program mode of the two entries.

**Verification (August 26, 2026):**
Fixed and confirmed by executed tests. `detectConflictsForEntry` and `detectConflictsSparse` in `lib/scheduling/conflicts.ts` now skip any pair where `resolveProgramMode(o) !== candidateMode`, and the backend campus-wide scan in `scheduling.controller.ts` applies the same rule. Four automated cases pass: no conflict across Day and Night on the dense path, none on the sparse grid path, none when Night is stored with the `Night::` day prefix, and a genuine same-program double-booking is still detected (confirming the fix did not simply disable conflict checking). One further affected endpoint was still unfixed and is filed as BUG-2026-006.

**Suspected Component:** `opticore-web/lib/scheduling/conflicts.ts`; `opticore-backend/src/controllers/scheduling.controller.ts`.

---

## BUG-2026-003

| Field | Value |
|---|---|
| **Bug ID** | BUG-2026-003 |
| **Date Reported** | August 26, 2026 |
| **Reported By** | Team Clutchers (QA) |
| **Project / System** | OptiCore: Campus Intelligence System |
| **Module / Feature** | Scheduling Core — Day / Night Program data separation (Evaluator, INS Forms, Search) |
| **Build / Version** | Current development build (Night Program integration) |
| **Severity** | Critical |
| **Priority** | High |
| **Status** | **Resolved for plotting, conflict checking, and search — INS Form output pending retest** |
| **Reproducibility** | Always (before fix) |
| **Environment** | Web browser (Chrome / Edge), Next.js 15 + Supabase, Express API |

**Bug Summary:** Day Program and Night Program schedule data are not kept independent across plotting, conflict checking, INS Forms, and search.

**Description:**
Schedule records did not consistently carry a program-mode marker, so the two offerings shared one dataset. Switching the Evaluator to Night Program still showed Day rows, and Night rows appeared in the Day view. Night Program INS Forms listed Day classes, INS search returned both offerings regardless of mode, and faculty load totals combined Day and Night hours into one figure. A further symptom was that a Night class plotted at 6:00 PM was relocated to an earlier vacant slot (4:00 PM), because the Night start index was clamped against the shorter ten-slot Day grid.

**Preconditions:**
- User is logged in as Chairman or College Admin.
- An active academic period is selected.
- The same section and faculty have entries in both Day and Night.

**Steps to Reproduce:**
1. Log in as Chairman and select the active semester.
2. Open **Evaluator**, set the mode to **Day Program**, plot a class, and save.
3. Switch to **Night Program** and review the weekly grid.
4. Open **Load Generator** and generate INS Form 5B for the same section in Night mode.
5. Search the INS search box for the faculty member's classes.
6. Compare the faculty weekly load total against the Day-only and Night-only expected totals.

**Expected Result:**
Each mode shows only its own records. Day views contain Day entries only and Night views contain Night entries only. Faculty load is computed per program, and the datasets never merge. A Night class stays in the exact slot selected.

**Actual Result (as originally reported):**
Day entries appeared in Night views and the reverse. INS Forms and search returned mixed records, load totals combined both programs, and Night plots were relocated to earlier slots.

**Test Data:**
- Section: BSIT 3A (Day) and BSIT 3A (Night)
- Faculty: Gwyneth Alberca
- Day entry: Monday, 8:00 AM – 9:00 AM
- Night entry: Monday, 6:00 PM – 7:00 PM

**Evidence / Attachments:** Original screenshots of the Evaluator in both modes, the mixed INS Form, and the INS search panel; current automated test output.

**Console / Error Message:** None.

**Initial Analysis:**
`ScheduleEntry` lacked a reliable program-mode attribute on every write path, and read paths did not filter by mode. The slot relocation was caused by clamping the Night start index against the Day grid length.

**Verification (August 26, 2026):**
Largely fixed and confirmed by executed tests.

- Program mode now resolves from the `programMode` column, falling back to the `Night::` day prefix when the column is absent (`resolveProgramMode`), and `filterByProgramMode` returns Night-only and Day-only sets correctly, including for legacy untagged rows.
- Exact slot placement is restored by `clampPlotStartSlotIndex` in `lib/evaluator/plot-duration.ts`. Tests confirm Monday 6:00 PM – 7:00 PM, Tuesday 6:00 PM – 8:00 PM, and Saturday 7:00 AM – 9:00 AM all keep their selected times with no shift to 4:00 PM.
- Night windows are enforced correctly: Monday–Friday plotting is rejected before 4:00 PM and allowed from 4:00 PM to 10:00 PM; Saturday and Sunday are allowed from 7:00 AM.
- Day Program behaviour is unchanged (ten hourly slots, 7:00 AM – 5:00 PM, Monday–Friday).

**Not yet re-verified:** whether the Evaluator grid visually renders the Night block on the correct row, and whether generated INS Forms are free of cross-program entries. Both need a browser session.

**Important note for the record:** during verification the team found that these fixes were present in the Git index but had been reverted in the working copy, so the code on disk was running the older, unfixed behaviour. The files were restored from the index before testing. Any retest must confirm it is running the restored build.

**Suspected Component:** `lib/scheduling/program-mode.ts`, `lib/evaluator/plot-duration.ts`, `lib/chairman/evaluator-schedule-persist.ts`, `opticore-backend/src/lib/schedule-entries.ts`, and the INS catalog read paths.

---

## BUG-2026-004

| Field | Value |
|---|---|
| **Bug ID** | BUG-2026-004 |
| **Date Reported** | August 26, 2026 |
| **Reported By** | Team Clutchers (QA) |
| **Project / System** | OptiCore: Campus Intelligence System |
| **Module / Feature** | Conflict Checker — time display and program time windows |
| **Build / Version** | Current development build (Night Program integration) |
| **Severity** | Medium |
| **Priority** | Medium |
| **Status** | **Resolved — pending user acceptance retest** |
| **Reproducibility** | Always (before fix) |
| **Environment** | Web browser (Chrome / Edge), Next.js 15 + Supabase, Express API |

**Bug Summary:** Conflict Checker displayed 24-hour times, making conflict messages hard to read.

**Description:**
Conflict messages presented times in raw 24-hour database format, for example *"Monday 16:00–17:00,"* instead of the readable 12-hour format used elsewhere in the system. The same raw values appeared in conflict summaries and suggested-alternative labels, slowing conflict resolution and increasing the chance of correcting the wrong row.

**Preconditions:**
- User is logged in as Chairman or College Admin.
- At least one genuine conflict exists in the selected academic period.

**Steps to Reproduce:**
1. Log in as Chairman and select the active semester.
2. Open **Evaluator**.
3. Plot two classes for the same faculty member on Monday at 4:00 PM – 5:00 PM within the same program mode.
4. Click **Run conflict check (campus-wide)**.
5. Read the conflict message and the suggested alternative slots.

**Expected Result:**
Messages show readable 12-hour times, for example *"Monday 4:00 PM – 5:00 PM."* Programme windows are Day Program Monday–Friday 7:00 AM – 5:00 PM, and Night Program Monday–Friday 4:00 PM – 10:00 PM with Saturday–Sunday 7:00 AM – 10:00 PM.

**Actual Result (as originally reported):**
Messages displayed raw 24-hour times such as *"overlaps another assignment on Monday 16:00–17:00."*

**Test Data:**
- Faculty: Gwyneth Alberca
- Conflicting entries: Monday, 4:00 PM – 5:00 PM, same program mode

**Evidence / Attachments:** Original screenshot of the Conflict Check results panel; current automated test output.

**Console / Error Message:** None.

**Initial Analysis:**
Message builders concatenated the stored `startTime` and `endTime` strings directly instead of passing them through the 12-hour formatting helper.

**Verification (August 26, 2026):**
Fixed and confirmed by an executed test asserting the exact rendered string. `formatSparseConflictLines` in `lib/evaluator/plot-conflict-messages.ts` now formats through `formatTimeRange12h` and strips the `Night::` prefix; the backend uses the same helper. The message that previously read *"…on Monday 16:00–17:00"* now renders as:

> Gwyneth Alberca is double-booked: overlaps another assignment on Monday 4:00 PM – 5:00 PM.

The test also asserts the output contains neither `16:00` nor `Night::`.

**Remaining gap:** the message still does not name the program window (Day Program or Night Program). If the team wants that label, it should be raised as a separate enhancement rather than reopening this bug.

**Suspected Component:** `lib/evaluator/plot-conflict-messages.ts`, `lib/time/format-12h.ts`, `opticore-backend/src/lib/program-mode.ts`.

---

## BUG-2026-005

| Field | Value |
|---|---|
| **Bug ID** | BUG-2026-005 |
| **Date Reported** | August 26, 2026 |
| **Reported By** | Team Clutchers (QA) |
| **Project / System** | OptiCore: Campus Intelligence System |
| **Module / Feature** | Evaluator — Save Schedule (Schedule Entry API) |
| **Build / Version** | Current development build (Night Program integration) |
| **Severity** | High |
| **Priority** | High |
| **Status** | **Open — unable to reproduce; evidence required** |
| **Reproducibility** | Intermittent |
| **Environment** | Web browser (Chrome / Edge), Next.js 15 + Supabase, Express API |

**Bug Summary:** JSON coerce error when saving schedule entries — the API response cannot be parsed and the save fails without a clear message.

**Description:**
Saving a plotted schedule intermittently failed with a JSON parsing or type-coercion error. The user saw a generic failure and the schedule was not written. In some attempts part of the batch was saved, leaving the Evaluator grid out of sync with stored records until reload. The failure was reported more often when the batch included newly added Night Program rows.

**Preconditions:**
- User is logged in as Chairman with edit rights on the selected program.
- An active academic period is selected and the schedule is not yet published.
- Several rows are plotted, including at least one new row.

**Steps to Reproduce:**
1. Log in as Chairman and select the active semester.
2. Open **Evaluator** and plot three or more classes, leaving the Students field blank on one row.
3. Click **Save schedule**.
4. Observe the notification, then inspect the browser console and Network tab.
5. Reload the page and compare the grid against the stored records.

**Expected Result:**
All valid rows are saved. An invalid field produces a structured JSON error naming the field and row, and the interface shows a specific readable message.

**Actual Result (as originally reported):**
The save failed with a JSON coerce / parse error, the user saw only a generic failure notice, and part of the batch was sometimes written.

**Test Data:**
- Section: BSIT 3A; Subject: IT 311 (Lecture); Faculty: Gwyneth Alberca; Room: IT Laboratory 1
- Students field: left blank
- Time: Monday, 6:00 PM – 7:00 PM (Night Program)

**Evidence / Attachments:** **Missing — required.** No screenshot, console capture, or Network response body was retained from the original occurrence.

**Console / Error Message:** Not captured. The exact message must be recorded on the next occurrence.

**Initial Analysis:**
Suspected mismatch between the submitted request body and the validation schema, with the error path returning a non-JSON response so the client's `response.json()` call throws before the real validation message can surface.

**Verification (August 26, 2026):**
Could not be confirmed. A search of both code bases found only one `z.coerce` usage, in `opticore-backend/src/config/env.ts` for the `PORT` variable, which is unrelated to schedule saving. No coercion schema was found on the schedule-entries write path. Reproducing this requires a logged-in browser session, which was not available during this verification pass.

**Action required:** on the next occurrence, capture the toast message, the full console output, and the failing request and response from the Network tab. Without that evidence this item cannot be diagnosed or closed, and it should not be presented as a confirmed defect.

**Suspected Component:** Schedule-entries write path in the Express catalog controller and API client error handling in `lib/api/client.ts`.

---

## BUG-2026-006

| Field | Value |
|---|---|
| **Bug ID** | BUG-2026-006 |
| **Date Reported** | August 26, 2026 |
| **Reported By** | Team Clutchers (QA) |
| **Project / System** | OptiCore: Campus Intelligence System |
| **Module / Feature** | DOI / VPAA — Schedule Conflicts endpoint |
| **Build / Version** | Current development build (Night Program integration) |
| **Severity** | Critical |
| **Priority** | High |
| **Status** | **Resolved — pending user acceptance retest** |
| **Reproducibility** | Always (before fix) |
| **Environment** | Express API (`opticore-backend`), Supabase |

**Bug Summary:** The DOI / VPAA conflict endpoint mixed Day and Night loads and missed genuine overlaps because it compared times as text.

**Description:**
While verifying BUG-2026-002, the team found a second conflict-detection routine that had not been corrected. `getScheduleConflicts` in `doi-extra.controller.ts` compared every pair of schedule entries with no program-mode filter, so the same false cross-program double-booking described in BUG-2026-002 could still be raised in the DOI / VPAA queue even though the Evaluator no longer reported it.

The same routine also compared start and end times as plain strings. Because `"9:00" >= "10:00"` evaluates to true in text comparison, real overlaps involving single-digit hours were silently missed — a second, opposite defect in which genuine conflicts went unreported. Finally, the routine did not strip the `Night::` day prefix, so behaviour differed depending on whether the `programMode` column was present in the database.

**Preconditions:**
- A DOI / VPAA account can reach the schedule conflicts queue.
- An academic period contains a faculty member with both a Day and a Night class at overlapping times.

**Steps to Reproduce:**
1. Ensure a faculty member has a Day class and a Night class on the same weekday at overlapping times.
2. Log in as DOI / VPAA.
3. Open the schedule conflicts view for that academic period.
4. Review the reported faculty double-bookings.
5. Separately, create two same-program classes at 9:00 AM – 11:00 AM and 10:00 AM – 12:00 NN and confirm whether the overlap is reported.

**Expected Result:**
Cross-program overlaps are not reported. Genuine same-program overlaps are reported regardless of the hour, including single-digit hours, with readable 12-hour times.

**Actual Result (before fix):**
Cross-program overlaps were reported as false double-bookings, and same-program overlaps spanning single-digit and double-digit hours were not detected. Messages carried no time information.

**Test Data:**
- Faculty: Gwyneth Alberca
- Cross-program pair: Monday 4:00 PM – 5:00 PM Day and Monday 4:00 PM – 5:00 PM Night
- Missed-overlap pair: Monday 9:00 AM – 11:00 AM and Monday 10:00 AM – 12:00 NN, same program

**Evidence / Attachments:** Code inspection of `doi-extra.controller.ts` before and after the change.

**Console / Error Message:** None.

**Initial Analysis:**
The endpoint predated the Day / Night work and was never brought in line with the corrected scan in `scheduling.controller.ts`.

**Verification (August 26, 2026):**
Fixed during this verification pass. The endpoint now skips pairs whose program modes differ, normalizes weekdays through `calendarDay` so the `Night::` prefix cannot change the result, compares times as numeric minutes from midnight, and reports readable 12-hour ranges. The change type-checks cleanly and the backend restarts and serves healthy.

**Suspected Component:** `opticore-backend/src/controllers/doi-extra.controller.ts`.

---

## BUG-2026-007

| Field | Value |
|---|---|
| **Bug ID** | BUG-2026-007 |
| **Date Reported** | August 26, 2026 |
| **Reported By** | Team Clutchers (QA) |
| **Project / System** | OptiCore: Campus Intelligence System |
| **Module / Feature** | Load Generator — INS Form 5A / 5B / 5C cell rendering |
| **Build / Version** | Current development build (Night Program integration) |
| **Severity** | High |
| **Priority** | High |
| **Status** | Open |
| **Reproducibility** | Always |
| **Environment** | Web browser (Chrome / Edge), Next.js 15 + Supabase |

**Bug Summary:** An INS time cell displays at most two classes and silently drops any additional class.

**Description:**
Found while inspecting the layout fix for BUG-2026-001. All three INS forms render each time cell with `items.slice(0, 2)`, so only the first two entries in a slot are drawn. If a third class occupies the same time cell it is omitted from both the preview and the printed form, with no indicator, warning, or overflow marker. This is more serious than the original overlap defect: overlapping text is visibly wrong and prompts the user to investigate, whereas a silently dropped class produces a clean-looking official document that is incomplete. A load sheet could be signed and filed while missing a class.

**Preconditions:**
- An active academic period is selected.
- A single time cell on one INS form holds three or more classes.

**Steps to Reproduce:**
1. Plot three classes that fall in the same day column and time row for one section, faculty member, or room.
2. Open **Load Generator** and select the corresponding tab.
3. Inspect the affected time cell in the preview.
4. Generate the printed INS Form and inspect the same cell.
5. Compare the cell contents against the plotted entries in the Evaluator.

**Expected Result:**
Every class in a time cell is represented. If space is genuinely insufficient, the form shows an explicit overflow indicator such as "+1 more" so the reader knows the cell is truncated.

**Actual Result:**
Only the first two classes appear. The third and any further classes are omitted with no indication, in both the preview and the printed output.

**Test Data:**
- Section: BSIT 3A
- Three classes plotted on Monday, 8:00 AM – 9:00 AM

**Evidence / Attachments:** Code inspection of the `renderCell` callbacks in `OpticoreInsDocuments.tsx`; screenshot of an affected cell required.

**Console / Error Message:** None.

**Initial Analysis:**
`items.slice(0, 2)` in the `renderCell` callbacks of `OpticoreInsForm5A`, `OpticoreInsForm5B`, and `OpticoreInsForm5C` hard-caps rendering at two entries with no overflow handling.

**Suspected Component:** `components/ins/ins-layout/OpticoreInsDocuments.tsx`.

---

## BUG-2026-008

| Field | Value |
|---|---|
| **Bug ID** | BUG-2026-008 |
| **Date Reported** | August 26, 2026 |
| **Reported By** | Team Clutchers (QA) |
| **Project / System** | OptiCore: Campus Intelligence System |
| **Module / Feature** | Backend build and deployment configuration |
| **Build / Version** | Current development build (Night Program integration) |
| **Severity** | High |
| **Priority** | High |
| **Status** | **Resolved** |
| **Reproducibility** | Always (before fix) |
| **Environment** | `opticore-backend`, Node.js, TypeScript 7 |

**Bug Summary:** The backend has no `tsconfig.json`, so the documented build and production start commands both fail.

**Description:**
`opticore-backend` contains no `tsconfig.json`. Its `package.json` declares `build` as `tsc` and `start` as `node dist/server.js`, but with no project configuration `tsc` cannot compile the project — it prints its help text and exits with an error instead of building. Because nothing is emitted to `dist/`, `npm start` cannot run either. Only `npm run dev`, which uses `tsx watch` and performs no type checking, actually works. The practical consequences are that the backend cannot be type-checked as part of quality assurance, type errors can reach production undetected, and the documented production start path is broken.

**Preconditions:**
- A clean checkout of `opticore-backend` with dependencies installed.

**Steps to Reproduce:**
1. Open a terminal in `opticore-backend`.
2. Run `npx tsc --noEmit` and observe that the compiler prints usage help and exits with a non-zero status.
3. Run `npx tsc -p tsconfig.json --noEmit` and observe `error TS5058: The specified path does not exist`.
4. List the directory contents and confirm no `tsconfig.json` is present.
5. Run `npm run build`, then `npm start`, and observe that no `dist/` output is produced.

**Expected Result:**
`npx tsc --noEmit` type-checks the project and reports errors or exits clean. `npm run build` emits compiled output to `dist/`, and `npm start` runs the compiled server.

**Actual Result:**
`tsc` prints its help text and exits 1. `tsc -p tsconfig.json` fails with TS5058. No `dist/` output is produced and `npm start` cannot run the server.

**Test Data:** Not applicable — configuration defect.

**Evidence / Attachments:** Terminal output of the commands above and a directory listing of `opticore-backend`.

**Console / Error Message:**
`error TS5058: The specified path does not exist: '.../opticore-backend/tsconfig.json'`

**Initial Analysis — root cause confirmed:**
`opticore-backend/.gitignore` lists `tsconfig.json` as an ignored path, so the TypeScript project configuration is deliberately excluded from version control and never reaches a fresh checkout or a deployment build. The same `.gitignore` also excludes `package-lock.json`, which removes dependency-version pinning and makes builds non-reproducible across machines and deployments.

Verification of edited backend files had to be performed by invoking `tsc` with explicit compiler flags against `src/server.ts` as a workaround. Doing so surfaced pre-existing type errors in `analytics.controller.ts` and `scheduling.controller.ts` that had never been detected, confirming that the absence of a working type check had already allowed defects into the code base. Those errors were corrected on August 26, 2026 and the backend now type-checks clean under the workaround command.

**Verification (August 26, 2026):**
Fixed. `tsconfig.json` and `package-lock.json` were removed from `.gitignore` and committed, a compiler configuration was added, and the build output directory `dist/` is now ignored instead. Confirmed working end to end: `npx tsc --noEmit` exits clean, `npm run build` emits 94 files to `dist/`, and `npm start` runs the compiled server, which answers the health endpoint successfully. The backend can now be type-checked as part of routine quality assurance.

**Suspected Component:** `opticore-backend/.gitignore`, project root configuration, and `package.json` scripts.

---

## BUG-2026-009

| Field | Value |
|---|---|
| **Bug ID** | BUG-2026-009 |
| **Date Reported** | August 26, 2026 |
| **Reported By** | Team Clutchers (QA) |
| **Project / System** | OptiCore: Campus Intelligence System |
| **Module / Feature** | GEC — Section Plotting Table |
| **Build / Version** | Current development build (Night Program integration) |
| **Severity** | Critical |
| **Priority** | High |
| **Status** | **Resolved** |
| **Reproducibility** | Always (before fix) |
| **Environment** | `opticore-web`, Next.js 15, TypeScript |

**Bug Summary:** A build-breaking import name mismatch in the GEC section plotting table prevented the frontend from compiling.

**Description:**
`GecSectionPlottingTable.tsx` imported `clampStartSlotIndex` from `lib/evaluator/plot-duration`, but the module exports the function as `clampPlotStartSlotIndex`. The mismatch caused a TypeScript compilation failure, so the frontend could not pass a type check and a production build would fail. The GEC section plotting screen depends on this helper for both applying a slot range and computing the effective start slot, so the defect sits directly on the Night Program plotting path.

**Preconditions:**
- A checkout of `opticore-web` with dependencies installed.

**Steps to Reproduce:**
1. Open a terminal in `opticore-web`.
2. Run `npx tsc --noEmit`.
3. Observe the reported error.

**Expected Result:**
The project type-checks with no errors and builds successfully.

**Actual Result:**
Compilation failed with:
`components/gec/GecSectionPlottingTable.tsx(16,3): error TS2724: '"@/lib/evaluator/plot-duration"' has no exported member named 'clampStartSlotIndex'. Did you mean 'clampPlotStartSlotIndex'?`

**Test Data:** Not applicable — compilation defect.

**Evidence / Attachments:** TypeScript compiler output before and after the correction.

**Console / Error Message:** `error TS2724` as quoted above.

**Initial Analysis:**
The helper was renamed to `clampPlotStartSlotIndex` when the Night Program slot-clamping fix was introduced, and this consumer was not updated.

**Verification (August 26, 2026):**
Fixed by updating the import and its two call sites to `clampPlotStartSlotIndex`. `npx tsc --noEmit` now exits clean and the full test suite passes with 127 tests across 16 files.

**Suspected Component:** `components/gec/GecSectionPlottingTable.tsx`, `lib/evaluator/plot-duration.ts`.

---

## SUMMARY TABLE

| Bug ID | Module | Summary | Severity | Priority | Status |
|--------|--------|---------|----------|----------|--------|
| BUG-2026-001 | Load Generator (INS Forms 5A / 5B / 5C) | INS Form preview and print layout broken — overlapping text and misaligned time cells | High | High | Open — partially mitigated |
| BUG-2026-002 | Conflict Checker (Evaluator) | False faculty double-booking between a Day Program load and a Night Program load | Critical | High | Resolved — pending retest |
| BUG-2026-003 | Scheduling Core — Day / Night separation | Day and Night data mix across plotting, conflict checking, INS Forms, and search | Critical | High | Resolved except INS output — pending retest |
| BUG-2026-004 | Conflict Checker — time display | Conflict messages used 24-hour times instead of readable ranges | Medium | Medium | Resolved — pending retest |
| BUG-2026-005 | Evaluator — Save Schedule (API) | JSON coerce error on schedule save | High | High | Open — unable to reproduce; evidence required |
| BUG-2026-006 | DOI / VPAA — Schedule Conflicts endpoint | Endpoint mixed Day and Night loads and missed overlaps due to text time comparison | Critical | High | Resolved — pending retest |
| BUG-2026-007 | Load Generator — INS cell rendering | Time cell shows at most two classes and silently drops any third | High | High | Open |
| BUG-2026-008 | Backend build configuration | `tsconfig.json` and lockfile were gitignored; build and start both failed | High | High | Resolved |
| BUG-2026-009 | GEC — Section Plotting Table | Import name mismatch broke the frontend TypeScript build | Critical | High | Resolved |

**Totals:** 9 defects — 4 Critical, 4 High, 1 Medium.
**By state:** 3 Open (BUG-001, BUG-005, BUG-007); 6 Resolved, of which 4 await user acceptance retest.

---

## SOURCE-CONTROL INCIDENT (for the team's awareness, not a product defect)

During verification the team found that the Day / Night fixes were staged in the Git index but reverted in the working copy, meaning the code on disk was the older, unfixed build. Nineteen files were affected and the Night-plotting test file had been deleted from the working copy. The files were restored from the index, and the reverted state was preserved as a patch before restoring. This did not affect end users, but it explains why an earlier informal check appeared to show the bugs still present. Any retest must confirm it is running the restored build.
