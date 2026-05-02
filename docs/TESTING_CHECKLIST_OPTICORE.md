# OptiCore manual testing checklist

Use after changes to scheduling, INS forms, GEC access, profile uploads, and role-based views.

## Authentication & roles

- [ ] **Program Chairman** — login, dashboard, evaluator, INS (Faculty / Section / Room tabs), conflict check.
- [ ] **College Admin** — same INS tab layout as chairman; college-scoped evaluator; access requests inbox; INS signer labels (collapsible) save and reload.
- [ ] **GEC Chairman** — Central Hub Evaluator; **request access per college** (two colleges → two approvals); vacant GEC edit only where approved; INS tabs match college admin layout.
- [ ] **DOI Admin** — combined `/doi/ins?tab=*`; VPAA approval panel on faculty tab; campus-wide INS; DOI signer labels (VPAA line) save.
- [ ] **Instructor** — `/faculty/ins?tab=*` same chrome as admins; schedule read-only; **Request schedule change** from INS cells where enabled; link to faculty home/evaluator as configured.
- [ ] **Student** — portal read paths unchanged (smoke).
- [ ] **Visitor** — blocked from admin routes (smoke).

## Scheduling & reflection

- [ ] **Chairman flow** — plot in evaluator → Save → reload INS for same college/program; totals and grid match.
- [ ] **Realtime** — second browser or role: schedule change appears without full page reload where Realtime is wired.

## GEC Chairman — per-college access

- [ ] Submit access request **with college A** only → approve as College Admin of A → edit vacant GEC in evaluator with college A selected → **allowed**.
- [ ] Switch to college B (no approval) → vacant GEC edits **blocked** until separate request approved for B.

## Instructor — schedule change

- [ ] From INS (read-only), click a class cell → request submitted → College Admin sees request → decision reflects on instructor view.

## Policy justification

- [ ] Trigger overload in evaluator → justification modal → save → DOI / college flows see justification if applicable to your build.

## Conflicts & alternatives

- [ ] Run **Conflict check** on INS (college/DOI) and evaluator; apply first alternative where enabled; confirm row updates and INS totals after reload.

## INS forms — UI parity & print

- [ ] Compare **Faculty / Section / Room** tab strip and card padding across: College Admin, Chairman, DOI, GEC, Instructor (`?tab=`).
- [ ] **Print / PDF** — each form shows schedule + signature columns with space for names; optional **signer labels** from College/DOI editors appear on print after save + reload.

## Profile picture & signature

- [ ] Upload avatar **larger than 2 MB but under 10 MB** — succeeds; header updates after refresh.
- [ ] Reject **over 10 MB** with clear error (client-side).
- [ ] Signature image upload same limit (bucket migration applied in Supabase).

## Cross-role data

- [ ] Evaluator change → INS faculty/section/room for all roles that share the term and RLS scope.

---

*Maintainers: extend this list when adding new workflows; keep steps outcome-based (observable UI or DB), not implementation-specific.*
