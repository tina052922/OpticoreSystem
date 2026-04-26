"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Q } from "@/lib/supabase/catalog-columns";
import type { AcademicPeriod, DoiScheduleFinalization } from "@/types/db";
import { useOpticoreToast } from "@/components/alerts/OpticoreToastProvider";

type ConflictPayload = {
  entryCount?: number;
  conflictingEntryIds?: string[];
  issueSummaries?: string[];
  issues?: { entryId: string; type: string; message: string; relatedEntryId?: string }[];
  error?: string;
};

/**
 * DOI / VPAA: campus-wide conflict scan, INS form shortcuts, and formal approve/reject with signature.
 */
export function DoiScheduleHubClient() {
  const toast = useOpticoreToast();
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [loadingPeriods, setLoadingPeriods] = useState(true);

  const [conflictBusy, setConflictBusy] = useState(false);
  const [conflict, setConflict] = useState<ConflictPayload | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [finalization, setFinalization] = useState<DoiScheduleFinalization | null>(null);
  const [signedByName, setSignedByName] = useState("");
  const [signedAck, setSignedAck] = useState(false);
  const [notes, setNotes] = useState("");
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPeriods(true);
      try {
        const supabase = createSupabaseBrowserClient();
        if (!supabase) return;
        const { data } = await supabase.from("AcademicPeriod").select(Q.academicPeriod).order("startDate", { ascending: false });
        const list = (data ?? []) as AcademicPeriod[];
        if (!cancelled && list.length) {
          setPeriods(list);
          const cur = list.find((p) => p.isCurrent) ?? list[0];
          if (cur) setPeriodId(cur.id);
        }
      } catch {
        if (!cancelled) setPeriods([]);
      } finally {
        if (!cancelled) setLoadingPeriods(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
      const hasIssues = (data.conflictingEntryIds?.length ?? 0) > 0 || (data.issues?.length ?? 0) > 0;
      if (!hasIssues) toast.success("No conflicts detected");
      else toast.info("Conflicts found – see details below", `${data.conflictingEntryIds?.length ?? 0} entries involved.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Check failed";
      setConflictError(msg);
      toast.error("Failed to run conflict check. Please try again.", msg);
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
        toast.success("Schedule published and locked successfully");
      } else {
        toast.success("Schedule decision saved");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Update failed";
      setDecisionError(msg);
      toast.error("Failed to update. Please try again.", msg);
    } finally {
      setDecisionBusy(null);
    }
  }

  const noConflicts =
    conflict &&
    (conflict.conflictingEntryIds?.length ?? 0) === 0 &&
    (conflict.issues?.length ?? 0) === 0;

  return (
    <div>
      <ChairmanPageHeader
        title="Schedule hub (VPAA)"
        subtitle="Run a campus-wide conflict check, review INS forms, and record formal approval or rejection with signature."
      />
      <div className="px-4 md:px-8 pb-10 max-w-4xl mx-auto space-y-8">
        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-black">Term</h2>
          {loadingPeriods ? (
            <p className="text-sm text-black/50">Loading periods…</p>
          ) : (
            <select
              className="w-full max-w-md h-11 rounded-lg border border-black/15 px-3 text-sm"
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </section>

        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-black">INS forms (live)</h2>
          <p className="text-sm text-black/65">
            Open the same INS layouts as College Admin — faculty, section, and room views — in a new tab.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-[var(--color-opticore-orange)] hover:bg-[#e88909] text-white">
              <Link href="/doi/ins/faculty">INS — Faculty</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/doi/ins/section">INS — Section</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/doi/ins/room">INS — Room</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/doi/evaluator">Central Hub Evaluator</Link>
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-black">Campus-wide conflict check</h2>
          <p className="text-sm text-black/65">
            Scans every plotted row for the selected term (all colleges). Use before recording VPAA approval.
          </p>
          <Button
            type="button"
            className="bg-[#780301] hover:bg-[#5a0201] text-white"
            disabled={conflictBusy || !periodId}
            onClick={() => void runCampusConflictCheck()}
          >
            {conflictBusy ? "Scanning…" : "Run campus-wide conflict check"}
          </Button>
          {conflictError ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{conflictError}</p>
          ) : null}
          {conflict ? (
            <div
              className={`rounded-lg border px-3 py-3 text-sm ${
                noConflicts ? "border-emerald-200 bg-emerald-50/90" : "border-amber-200 bg-amber-50/90"
              }`}
            >
              <p className="font-semibold text-black">
                {noConflicts
                  ? "No conflicts detected. Schedule can be approved."
                  : `Conflicts found — ${conflict.conflictingEntryIds?.length ?? 0} entries involved.`}
              </p>
              <p className="text-black/70 mt-1">Rows scanned: {conflict.entryCount ?? 0}</p>
              {conflict.issueSummaries && conflict.issueSummaries.length > 0 ? (
                <ul className="mt-2 list-disc pl-5 text-black/80 space-y-1">
                  {conflict.issueSummaries.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-black">Formal approval (VPAA)</h2>
          {finalization?.status === "approved" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
              <p className="font-semibold">Approved</p>
              <p>
                Signed by <strong>{finalization.signedByName}</strong>
                {finalization.signedAt ? ` on ${new Date(finalization.signedAt).toLocaleString()}` : ""}.
              </p>
              {finalization.notes ? <p className="mt-1">Notes: {finalization.notes}</p> : null}
            </div>
          ) : finalization?.status === "rejected" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-950">
              <p className="font-semibold">Rejected</p>
              {finalization.notes ? <p>Notes: {finalization.notes}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-black/65">No decision recorded for this term yet.</p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-black" htmlFor="doi-name">
              Sign as DOI Admin (full name)
            </label>
            <input
              id="doi-name"
              className="w-full max-w-md h-10 rounded-lg border border-black/15 px-3 text-sm"
              value={signedByName}
              onChange={(e) => setSignedByName(e.target.value)}
              placeholder="e.g. Dr. Maria Elena Reyes"
            />
            <label className="flex items-start gap-2 text-sm text-black/80 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 rounded border-black/20"
                checked={signedAck}
                onChange={(e) => setSignedAck(e.target.checked)}
              />
              I confirm this electronic acknowledgment represents my approval as DOI / VPAA for this term&apos;s master
              schedules.
            </label>
            <label className="text-sm font-medium text-black" htmlFor="doi-notes">
              Notes (optional)
            </label>
            <textarea
              id="doi-notes"
              className="w-full min-h-[72px] rounded-lg border border-black/15 px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {decisionError ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{decisionError}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              disabled={decisionBusy !== null || !periodId}
              onClick={() => void submitDecision("approve")}
            >
              {decisionBusy === "approve" ? "Saving…" : "Approve schedules (mark final)"}
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
          <p className="text-xs text-black/45">
            Approving sets all schedule rows in this term to <strong>final</strong> where they are not already final.
            Rejection records a VPAA decision without changing plotted rows.
          </p>
        </section>
      </div>
    </div>
  );
}
