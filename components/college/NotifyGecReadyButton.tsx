"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { authApi, catalogApi, collegeApi, ApiClientError } from "@/lib/api/client";
import { categoryLabelForProgram, sortProgramsForTeachingLoad } from "@/lib/scheduling/teaching-load-summary";
import type { Program } from "@/types/db";

const COLLEGE_WIDE = "";

export function NotifyGecReadyButton({
  academicPeriodId,
  periodLabel,
  programs: programsProp,
  className,
}: {
  academicPeriodId?: string | null;
  periodLabel?: string | null;
  /** When omitted, loads programs for the signed-in College Admin’s college. */
  programs?: Array<Pick<Program, "id" | "collegeId" | "code" | "name">>;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [fetched, setFetched] = useState<Program[]>([]);
  const [programId, setProgramId] = useState(COLLEGE_WIDE);

  useEffect(() => {
    if (programsProp) return;
    let cancelled = false;
    void (async () => {
      try {
        const [{ user }, { programs }] = await Promise.all([authApi.me(), catalogApi.programs()]);
        if (cancelled) return;
        const cid = user?.collegeId?.trim();
        setFetched((programs as Program[]).filter((p) => !cid || p.collegeId === cid));
      } catch {
        if (!cancelled) setFetched([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programsProp]);

  const programs = useMemo(
    () => sortProgramsForTeachingLoad(programsProp ?? fetched),
    [programsProp, fetched],
  );

  async function notify() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const selected = programs.find((p) => p.id === programId);
      const res = await collegeApi.notifyGecReady({
        academicPeriodId: academicPeriodId?.trim() || undefined,
        programId: programId || undefined,
        note: periodLabel ? `Term: ${periodLabel}` : undefined,
      });
      const scope = selected ? categoryLabelForProgram(selected) : "the college";
      setMsg(res.message ?? `GEC Chairman has been notified that ${scope} is ready for GEC plotting.`);
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to notify GEC.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-10 min-w-[200px] rounded-lg border border-black/20 bg-white px-2 text-[13px]"
          value={programId}
          onChange={(e) => setProgramId(e.target.value)}
          aria-label="Department to mark ready for GEC"
        >
          <option value={COLLEGE_WIDE}>Entire college</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {categoryLabelForProgram(p)}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void notify()}>
          {busy ? "Notifying GEC…" : "Notify GEC: ready for plotting"}
        </Button>
      </div>
      {msg ? <p className="mt-2 text-[12px] text-emerald-800">{msg}</p> : null}
      {err ? <p className="mt-2 text-[12px] text-red-700">{err}</p> : null}
    </div>
  );
}
