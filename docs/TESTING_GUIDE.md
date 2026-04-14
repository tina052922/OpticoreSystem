# OptiCore — End-to-End Testing Guide (Chairman → GEC → College Admin → DOI)

This guide walks testers through the **full scheduling and INS workflow**, including **digital signatures** and **INS forms** after VPAA approval.

**Screenshot placeholders:** Where you see **📷 Screenshot:**, capture the browser window (Win+Shift+S on Windows) and save with a clear filename (e.g. `01-chairman-evaluator.png`).

---

## 0. Prerequisites

1. **Supabase:** Apply migrations (including signature storage and `User.signatureImageUrl`):

   ```bash
   cd supabase
   npx supabase db push
   ```

   Or run new SQL files in the Supabase SQL Editor in order:

   - `20260414120000_user_signatures_storage_and_college_signers.sql`
   - `20260414120100_auth_get_my_user_row_signature.sql`

2. **Environment:** `web/.env.local` must include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and (for VPAA publish locks) `SUPABASE_SERVICE_ROLE_KEY` on the server.

3. **Test term:** Use the **current academic period** in seed/demo (e.g. the period marked current in **Academic Period**), or create one term and use it consistently for all roles.

4. **Test schedule:** Plot at least **one section** with **multiple `ScheduleEntry` rows** (different days/times) so INS grids and summaries are non-empty.

### DOI / VPAA approval is manual only (no auto-publish)

- **Chairman, College Admin, and GEC Chairman steps do not** call the VPAA publish API or set `ScheduleEntry.lockedByDoiAt`. Rows stay **`draft`** (or `conflicted` where applicable) until a **DOI Admin** explicitly submits **Approve & publish schedule** on the VPAA panel (`PATCH /api/doi/schedule-finalization`).
- Inbox forwards, GEC save notifications, and college hub review are **workflow only** — they never lock the master schedule.
- **Instructor** features (**My schedule**, **Request schedule change**) work against **draft** rows; change requests remain **`pending`** until College Admin acts.
- If your database was published during an earlier test, run [`supabase/scripts/clear_doi_publication_for_manual_retest.sql`](../supabase/scripts/clear_doi_publication_for_manual_retest.sql) (edit the academic period id) to clear locks and `DoiScheduleFinalization` for that term before a full dry run.

---

## 1. Accounts (roles)

Use separate browser profiles or incognito windows so sessions do not overwrite each other.

| Role | Typical portal path | Notes |
|------|---------------------|--------|
| **Program Chairman** | `/chairman/...` | BSIT/COTE chairman seed or your `chairman_admin` user |
| **GEC Chairman** | `/admin/gec/...` | `gec_chairman` — vacant GEC plotting |
| **College Admin** | `/admin/college/...` | `college_admin` scoped to a college |
| **DOI / VPAA** | `/doi/...` | `doi_admin` — campus-wide evaluator + INS + approval |

> **Exact emails/passwords** depend on your Supabase Auth seed. Use the accounts your team created in **Authentication → Users** and matching rows in `public."User"`.

---

## 2. Digital signatures (before VPAA approval)

Each role uploads a **PNG/JPEG signature image** in **Profile**:

| Role | URL (examples) |
|------|------------------|
| DOI | `/doi/profile` |
| College Admin | `/admin/college/profile` |
| GEC Chairman | `/admin/gec/profile` |
| Program Chairman | `/chairman/profile` |

**Steps**

1. Log in as the role.
2. Open **Profile**.
3. Scroll to **Digital signature (INS forms)**.
4. Click **Upload signature** — choose a small transparent-background PNG (under ~2 MB).
5. Confirm the preview shows your image. **📷 Screenshot:** profile with signature preview.

Signatures are stored in the **`signatures`** Storage bucket and the public URL is saved on `User.signatureImageUrl`.

**Optional — Campus Director & Contract signers (database or API)**

- Table `College` has `campusDirectorUserId` and `contractSignerUserId` (FK to `User`).
- College Admins or DOI can set these via API: `PATCH /api/college/signer-settings` with JSON:

  ```json
  {
    "collegeId": "<your-college-id>",
    "campusDirectorUserId": "<user-uuid>",
    "contractSignerUserId": "<user-uuid>"
  }
  ```

- Those users must also upload a signature in **Profile** for the image to appear on INS.

---

## 3. Flow A — Program Chairman (evaluator + INS)

1. Log in as **Chairman**.
2. Open **Central Hub Evaluator** (`/chairman/evaluator`), pick **college** + **department**, select the **term**.
3. Plot or edit **ScheduleEntry** rows for your program/section (Evaluator worksheet).
4. Open **INS Form → Faculty** (`/chairman/ins/faculty`).
5. Select a **faculty** who has classes this term.
6. **📷 Screenshot:** weekly grid + **Summary of courses** filled from live data.
7. Before VPAA publishes: signature strip shows **labels** and dashed boxes; **no** signature images yet.
8. Upload signature on **`/chairman/profile`** if not done.

---

## 4. Flow B — GEC Chairman (vacant GEC + INS)

1. Log in as **GEC Chairman** (`/admin/gec/...`).
2. Open **Evaluator** or **vacant GEC** tools; ensure **GEC/GEE** placeholder rows exist where applicable.
3. Open **INS** (`/admin/gec/ins/faculty` etc.). Confirm **orange “Vacant GEC”** highlights where applicable.
4. **📷 Screenshot:** GEC INS view.
5. Upload signature on **`/admin/gec/profile`**.

---

## 5. Flow C — College Admin

1. Log in as **College Admin**.
2. Review **Evaluator** / schedule for the college (`/admin/college/evaluator`).
3. Open **INS forms** (`/admin/college/ins/faculty`, `/section`, `/room`).
4. Confirm **Faculty / Section / Room** views show **live** schedule data for the selected term.
5. **📷 Screenshot:** INS Faculty with populated grid.
6. Upload signature on **`/admin/college/profile`**.
7. (Optional) Set `campusDirectorUserId` / `contractSignerUserId` for the college (SQL or API above).

---

## 6. Flow D — DOI / VPAA (conflicts + approval + INS)

1. Log in as **DOI**.
2. Open **Central Hub Evaluator** → choose **All colleges (campus-wide)** and the **same term**.
3. Run **campus-wide conflict check** in the VPAA panel; resolve or note conflicts.
4. When ready, **Approve & publish schedule** (name + checkbox + submit). This sets `lockedByDoiAt` on `ScheduleEntry` rows for that term.
5. Open **INS Form** (`/doi/ins/faculty` — campus-wide scope).
6. Select **faculty** with classes; confirm:
   - **Published** banner appears.
   - **Read-only** INS (no editable inputs for published view).
   - **Signature strip** (right side on wide screens) shows **five columns** in this order:
     1. **Approved by** (DOI)
     2. **Campus Director**
     3. **Reviewed & Certified by** (Program / GEC Chairman)
     4. **Contract**
     5. **Prepared by** (College Admin)
   - Uploaded **signature images** appear for each resolved user **after** publication.
7. **📷 Screenshot:** INS Faculty with all five signature columns visible after approval.
8. Repeat on **INS Section** (`/doi/ins/section`) and **INS Room** (`/doi/ins/room`) — same signature strip behavior.

**Faculty credentials on INS Form 5A (published)**

- If the instructor has a **`FacultyProfile`** row, degree lines fill automatically in read-only mode.

---

## 7. Data completeness (INS)

- **Course summaries, grids, and loads** come from **`ScheduleEntry`**, **Subject**, **Section**, **Room**, and **User** — not from a separate prospectus PDF.
- If a cell is empty, there is **no** plotted class for that slot in the database.
- **Prospectus** modules in the app (e.g. chairman worksheets) are **curriculum references**; INS “Summary of courses” lists **actual assigned courses** for the term.

---

## 8. GitHub — push the project

From the repo root (after committing):

```bash
git status
git add -A
git commit -m "feat: digital signatures, INS signature strip, college signers API, testing guide"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/YOUR_REPO.git
git push -u origin main
```

Replace the remote URL with your team’s GitHub repository. If `origin` already exists, use `git remote set-url origin ...` instead of `add`.

---

## 9. Quick checklist

- [ ] Migrations applied; Storage bucket `signatures` exists.
- [ ] Each role uploaded signature in **Profile**.
- [ ] Chairman + GEC plotted schedules for the test term.
- [ ] DOI ran conflict check and **approved** the term.
- [ ] INS Faculty/Section/Room show **five** signature columns with images (where users exist).
- [ ] `College` signer IDs set if testing Campus Director / Contract lines beyond defaults.

---

## 10. Troubleshooting

| Issue | What to check |
|--------|----------------|
| Signature upload fails | Browser console; Storage policies; file type/size; user logged in. |
| RPC `set_my_signature_image_url` fails | Migration applied; function granted to `authenticated`. |
| INS shows no images after approval | `termPublishLocked` (rows have `lockedByDoiAt`); users have `signatureImageUrl`; correct college inferred for chairman/college admin slots. |
| Campus Director / Contract blank | `College.campusDirectorUserId` / `contractSignerUserId` not set, or those users have no signature file. |

---

*Document version: matches OptiCore migrations dated 2026-04-14 (signatures + INS strip).*
