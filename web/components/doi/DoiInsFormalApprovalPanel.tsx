"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AcademicPeriod, DoiScheduleFinalization } from "@/types/db";

type ConflictPayload = {
  entryCount?: number;
  conflictingEntryIds?: string[];
  issueSummaries?: string[];
  issues?: { entryId: string; type: string; message: string; relatedEntryId?: string }[];
  error?: string;
};

export type DoiInsFormalApprovalPanelProps = {
  /** Selected academic term (shared with INS Form catalog). */
  periodId: string;
  periods: AcademicPeriod[];
  onPeriodIdChange: (id: string) => void;
  /** After successful publish, refresh INS data (locks + banners) without waiting on Realtime. */
  reloadCatalog?: () => void | Promise<void>;
};

/**
 * VPAA formal approval + campus-wide conflict scan, embedded in DOI INS Form views.
 * Styling matches INS: white cards, gray page chrome, orange primary actions.
 */
export function DoiInsFormalApprovalPanel({
  periodId,
  periods,
  onPeriodIdChange,
  reloadCatalog,
}: DoiInsFormalApprovalPanelProps) {
  const [conflictBusy, setConflictBusy] = useState(false);
  const [conflict, setConflict] = useState<ConflictPayload | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [finalization, setFinalization] = useState<DoiScheduleFinalization | null>(null);
  const [signedByName, setSignedByName] = useState("");
  const [signedAck, setSignedAck] = useState(false);
  const [notes, setNotes] = useState("");
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const loadFinalization = useCallback(async () => {
    if (!periodId) return;
    try {
      const res = await fetch(`/api/doi/schedule-finalization?periodId=${encodeURIComponent(periodId)}`, {
        credentials: "include",
      });
      const data = (await res.json()) as { finalization?: DoiScheduleFinalization | null };
      if (res.ok) setFinalization(data.finalization ?? null);
    } catch {
      setFinalization(null);
    }
  }, [periodId]);

  useEffect(() => {
    void loadFinalization();
  }, [loadFinalization]);

  async function runCampusConflictCheck() {
    if (!periodId) return;
    setConflictBusy(true);
    setConflictError(null);
    setConflict(null);
    try {
      const res = await fetch(`/api/doi/schedule-conflicts?periodId=${encodeURIComponent(periodId)}`, {
        credentials: "include",
      });
      const data = (await res.json()) as ConflictPayload;
      if (!res.ok) throw new Error(data.error || "Check failed");
      setConflict(data);
    } catch (e) {
      setConflictError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setConflictBusy(false);
    }
  }

  async function submitDecision(action: "approve" | "reject") {
    if (!periodId) return;
    setDecisionBusy(action);
    setDecisionError(null);
    try {
      const res = await fetch("/api/doi/schedule-finalization", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicPeriodId: periodId,
          action,
          signedByName: action === "approve" ? signedByName.trim() : null,
          signedAcknowledged: action === "approve" ? signedAck : false,
          notes: notes.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string; finalization?: DoiScheduleFinalization };
      if (!res.ok) throw new Error(data.error || "Update failed");
      setFinalization(data.finalization ?? null);
      if (action === "approve") {
        setSignedAck(false);
        setSignedByName("");
        await reloadCatalog?.();
      }
    } catch (e) {
      setDecisionError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setDecisionBusy(null);
    }
  }

  /** Room, faculty, and section overlaps are all reported by the API; success only when nothing remains. */
  const noProblemsAcrossCampus =
    conflict &&
    (conflict.entryCount === 0 ||
      ((conflict.conflictingEntryIds?.length ?? 0) === 0 &&
        (conflict.issues?.length ?? 0) === 0 &&
        (conflict.issueSummaries?.length ?? 0) === 0));

  return (
    <div className="mb-6 space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Formal approval &amp; campus-wide check</h3>
            <p className="text-sm text-gray-600 mt-1">
              Select the same academic term as the INS grid below. Run a full conflict scan, then record VPAA approval
              with digital signature.
            </p>
          </div>
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Academic term</label>
            <select
              className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm"
              value={periodId}
              onChange={(e) => onPeriodIdChange(e.target.value)}
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="bg-[#780301] hover:bg-[#5a0201] text-white"
            disabled={conflictBusy || !periodId}
            onClick={() => void runCampusConflictCheck()}
          >
            {conflictBusy ? "Scanning…" : "Run campus-wide conflict check"}
          </Button>
        </div>

        {conflictError ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{conflictError}</p>
        ) : null}

        {conflict ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              noProblemsAcrossCampus ? "border-emerald-200 bg-emerald-50/90" : "border-amber-200 bg-amber-50/90"
            }`}
          >
            <p className="font-semibold text-gray-900">
              {noProblemsAcrossCampus
                ? conflict.entryCount === 0
                  ? "No schedule rows exist for this term yet — nothing to conflict-check."
                  : "No problems detected across all campus schedules."
                : "Remaining conflicts — review details before approving (room, faculty, and section overlaps)."}
            </p>
            <p className="text-gray-700 mt-1">Schedule rows scanned: {conflict.entryCount ?? 0}</p>
            {!noProblemsAcrossCampus && conflict.issueSummaries && conflict.issueSummaries.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-gray-800 space-y-1">
                {conflict.issueSummaries.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
            {!noProblemsAcrossCampus && conflict.issues && conflict.issues.length > 0 ? (
              <details className="mt-2 text-xs text-gray-700">
                <summary className="cursor-pointer font-medium">Detailed issues ({conflict.issues.length})</summary>
                <ul className="mt-1 space-y-0.5 pl-2 max-h-40 overflow-y-auto">
                  {conflict.issues.slice(0, 40).map((i, idx) => (
                    <li key={`${i.entryId}-${idx}`}>
                      {i.type}: {i.message}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}

        <div className="border-t border-gray-200 pt-4 space-y-3">
          <h4 className="text-sm font-bold text-gray-800">Digital signature (VPAA)</h4>
          {finalization?.status === "approved" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
              <p className="font-semibold">Published / approved</p>
              <p>
                Signed by <strong>{finalization.signedByName}</strong>
                {finalization.signedAt ? ` · ${new Date(finalization.signedAt).toLocaleString()}` : ""}
                {finalization.publishedAt ? ` · Published ${new Date(finalization.publishedAt).toLocaleString()}` : ""}
              </p>
              {finalization.notes ? <p className="mt-1">Notes: {finalization.notes}</p> : null}
            </div>
          ) : finalization?.status === "rejected" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-950">
              <p className="font-semibold">Rejected</p>
              {finalization.notes ? <p>Notes: {finalization.notes}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No VPAA decision recorded for this term yet.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700" htmlFor="doi-sign-name">
                Signer name (printed)
              </label>
              <input
                id="doi-sign-name"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm"
                value={signedByName}
                onChange={(e) => setSignedByName(e.target.value)}
                placeholder="Full name as DOI / VPAA"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Date / time</label>
              <p className="h-10 flex items-center text-sm text-gray-700 tabular-nums">
                {new Date().toLocaleString()}
                <span className="ml-2 text-xs text-gray-500">(captured on submit)</span>
              </p>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 rounded border-gray-300"
              checked={signedAck}
              onChange={(e) => setSignedAck(e.target.checked)}
            />
            I certify this electronic signature as the authorized DOI / VPAA representative for CTU Argao.
          </label>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700" htmlFor="doi-notes">
              Notes (optional)
            </label>
            <textarea
              id="doi-notes"
              className="w-full min-h-[72px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {decisionError ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{decisionError}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-[#FF990A] hover:bg-[#e88909] text-white"
              disabled={decisionBusy !== null || !periodId}
              onClick={() => void submitDecision("approve")}
            >
              {decisionBusy === "approve" ? "Saving…" : "Approve & publish schedule"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-red-300 text-red-800"
              disabled={decisionBusy !== null || !periodId}
              onClick={() => void submitDecision("reject")}
            >
              {decisionBusy === "reject" ? "Saving…" : "Reject"}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Approval marks every plotted row in this term as <strong>final</strong>, sets VPAA lock timestamps
            (no further editing by chair or college admin), and notifies instructors, students, CAS/GEC, and college
            leadership with links to the correct INS views. Rejection records the decision without changing timetable
            rows.
          </p>
        </div>
      </div>
    </div>
  );
}
