/** Mirrors backend `DOI_SCHEDULE_LOCKED_MESSAGE` for client toasts / banners. */
export const DOI_SCHEDULE_LOCKED_MESSAGE =
  "This term's schedule is locked by DOI. Only DOI can unpublish / unlock so edits can continue.";

export type TermDoiLockSignal = {
  /** From evaluator-bundle / explicit API flag (`academicPeriodIsDoiLocked`). */
  doiScheduleLocked?: boolean | null;
  /** `DoiScheduleFinalization.status` when already fetched. */
  finalizationStatus?: "pending" | "approved" | "rejected" | string | null;
  /** Any schedule rows for the term (lock stamp or empty-program fallback). */
  entries?: ReadonlyArray<{ academicPeriodId?: string; lockedByDoiAt?: string | null } | null | undefined>;
  academicPeriodId?: string | null;
};

/**
 * True when DOI has approved/published the term, or any row still carries `lockedByDoiAt`.
 * Matches backend {@link academicPeriodIsDoiLocked} intent for UI read-only (view OK, plot/edit blocked).
 */
export function termIsDoiPublished(signal: TermDoiLockSignal): boolean {
  if (signal.doiScheduleLocked) return true;
  if (signal.finalizationStatus === "approved") return true;
  const pid = (signal.academicPeriodId ?? "").trim();
  return (signal.entries ?? []).some((e) => {
    if (!e || !e.lockedByDoiAt) return false;
    if (!pid) return true;
    return !e.academicPeriodId || e.academicPeriodId === pid;
  });
}
