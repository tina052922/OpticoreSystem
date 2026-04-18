"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EnrichedConflictIssuesPanel } from "@/components/campus-intelligence/EnrichedConflictIssuesPanel";
import type { CampusConflictScanApiPayload } from "@/lib/scheduling/conflict-enrichment";
import type { GASuggestion } from "@/lib/scheduling/types";
import type { AcademicPeriod, DoiScheduleFinalization, ScheduleEntry } from "@/types/db";

type ConflictPayload = {
  entryCount?: number;
  conflictingEntryIds?: string[];
  issueSummaries?: string[];
  issues?: { entryId: string; type: string; message: string; relatedEntryId?: string }[];
  enrichedIssues?: CampusConflictScanApiPayload["enrichedIssues"];
  error?: string;
};

/** Optional: Central Hub connects conflict list to the orange grid + GA suggestions + direct edits. */
export type DoiConflictGridIntegration = {
  onFocusEntry?: (entryId: string) => void;
  suggestAlternativesForEntry?: (entryId: string) => GASuggestion[];
  applySchedulePatch?: (
    entryId: string,
    patch: Partial<Pick<ScheduleEntry, "day" | "startTime" | "endTime" | "roomId" | "instructorId">>,
  ) => Promise<void>;
  /** Turn a GA gene into labeled What / When / Where / Who for display. */
  formatGaSuggestion?: (suggestion: GASuggestion, anchorEntryId: string) => {
    what: string;
    when: string;
    where: string;
    who: string;
  };
};

export type DoiInsFormalApprovalPanelProps = {
  /** Selected academic term (shared with INS Form catalog). */
  periodId: string;
  periods: AcademicPeriod[];
  onPeriodIdChange: (id: string) => void;
  /** After successful publish, refresh INS data (locks + banners) without waiting on Realtime. */
  reloadCatalog?: () => void | Promise<void>;
  /** When set (Central Hub), conflict scan wires focus + suggestions into the evaluator grid. */
  gridIntegration?: DoiConflictGridIntegration;
  /** Called after a successful campus-wide scan (for grid highlights + hints). */
  onConflictScanComplete?: (payload: CampusConflictScanApiPayload) => void;
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
  gridIntegration,
  onConflictScanComplete,
}: DoiInsFormalApprovalPanelProps) {
  const [conflictBusy, setConflictBusy] = useState(false);
  const [conflict, setConflict] = useState<ConflictPayload | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [gaOpen, setGaOpen] = useState(false);
  const [gaEntryId, setGaEntryId] = useState<string | null>(null);
  const [gaList, setGaList] = useState<GASuggestion[]>([]);
  const [gaApplyBusy, setGaApplyBusy] = useState(false);

  const [finalization, setFinalization] = useState<DoiScheduleFinalization | null>(null);
  const [signedByName, setSignedByName] = useState("");
  const [signedAck, setSignedAck] = useState(false);
  const [notes, setNotes] = useState("");
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  /** Set only after mount so SSR and first client paint match (avoids `new Date()` hydration mismatch). */
  const [signaturePreviewAt, setSignaturePreviewAt] = useState<string | null>(null);

  useEffect(() => {
    setSignaturePreviewAt(new Date().toLocaleString());
  }, []);

  const loadFinalization = useCallback(async () => {
    const id = periodId.trim();
    if (!id) return;
    try {
      const res = await fetch(`/api/doi/schedule-finalization?periodId=${encodeURIComponent(id)}`, {
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
      if (
        typeof data.entryCount === "number" &&
        Array.isArray(data.conflictingEntryIds) &&
        Array.isArray(data.enrichedIssues)
      ) {
        onConflictScanComplete?.(data as CampusConflictScanApiPayload);
      }
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
            {!noProblemsAcrossCampus && conflict.enrichedIssues && conflict.enrichedIssues.length > 0 ? (
              <div className="mt-3">
                <EnrichedConflictIssuesPanel
                  title="Campus-wide conflict detail"
                  issues={conflict.enrichedIssues}
                  allowApply={false}
                  maxIssues={16}
                  renderIssueFooter={(iss) => (
                    <>
                      {gridIntegration?.onFocusEntry ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-[12px] h-8"
                            onClick={() => gridIntegration.onFocusEntry?.(iss.rowA.entryId)}
                          >
                            Show row A in grid
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-[12px] h-8"
                            onClick={() => gridIntegration.onFocusEntry?.(iss.rowB.entryId)}
                          >
                            Show row B in grid
                          </Button>
                        </>
                      ) : null}
                      {gridIntegration?.suggestAlternativesForEntry && gridIntegration.applySchedulePatch ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            className="text-[12px] h-8 bg-[#ff990a] hover:bg-[#e88909] text-white"
                            onClick={() => {
                              const id = iss.rowA.entryId;
                              setGaEntryId(id);
                              setGaList(gridIntegration.suggestAlternativesForEntry!(id));
                              setGaOpen(true);
                            }}
                          >
                            Suggest fix (row A)
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="text-[12px] h-8 bg-[#ff990a] hover:bg-[#e88909] text-white"
                            onClick={() => {
                              const id = iss.rowB.entryId;
                              setGaEntryId(id);
                              setGaList(gridIntegration.suggestAlternativesForEntry!(id));
                              setGaOpen(true);
                            }}
                          >
                            Suggest fix (row B)
                          </Button>
                        </>
                      ) : null}
                    </>
                  )}
                />
              </div>
            ) : !noProblemsAcrossCampus && conflict.issueSummaries && conflict.issueSummaries.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-gray-800 space-y-1">
                {conflict.issueSummaries.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
            {!noProblemsAcrossCampus &&
            (!conflict.enrichedIssues || conflict.enrichedIssues.length === 0) &&
            conflict.issues &&
            conflict.issues.length > 0 ? (
              <details className="mt-2 text-xs text-gray-700">
                <summary className="cursor-pointer font-medium">Raw pairwise issues ({conflict.issues.length})</summary>
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

        {gaOpen && gaEntryId ? (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4">
            <div
              className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl border border-black/10 max-h-[90vh] overflow-y-auto"
              role="dialog"
              aria-modal="true"
            >
              <h3 className="text-base font-bold text-gray-900 mb-1">Alternative slots (rule-based search)</h3>
              <p className="text-xs text-gray-600 mb-3">
                Each option lists What · When · Where · Who. Applying updates that schedule row in the database.
              </p>
              {gaList.length === 0 ? (
                <p className="text-sm text-gray-600">No conflict-free alternatives found in the search space.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {gaList.map((s, idx) => {
                    const fmt = gridIntegration?.formatGaSuggestion?.(s, gaEntryId);
                    return (
                      <li key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50/80">
                        {fmt ? (
                          <div className="space-y-1 text-[13px]">
                            <p>
                              <span className="font-semibold text-gray-700">What:</span> {fmt.what}
                            </p>
                            <p>
                              <span className="font-semibold text-gray-700">When:</span> {fmt.when}
                            </p>
                            <p>
                              <span className="font-semibold text-gray-700">Where:</span> {fmt.where}
                            </p>
                            <p>
                              <span className="font-semibold text-gray-700">Who:</span> {fmt.who}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[13px]">{s.label}</p>
                        )}
                        {gridIntegration?.applySchedulePatch ? (
                          <Button
                            type="button"
                            size="sm"
                            className="mt-2 bg-[#780301] hover:bg-[#5a0201] text-white"
                            disabled={gaApplyBusy}
                            onClick={async () => {
                              if (!gaEntryId) return;
                              setGaApplyBusy(true);
                              try {
                                await gridIntegration.applySchedulePatch!(gaEntryId, {
                                  day: s.day,
                                  startTime: s.startTime,
                                  endTime: s.endTime,
                                  roomId: s.roomId,
                                  instructorId: s.instructorId,
                                });
                                await reloadCatalog?.();
                                setGaOpen(false);
                              } finally {
                                setGaApplyBusy(false);
                              }
                            }}
                          >
                            Apply this option
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex justify-end mt-4">
                <Button type="button" variant="outline" onClick={() => setGaOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
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
                {signaturePreviewAt ?? "—"}
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
