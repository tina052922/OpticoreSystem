"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { collegeApi, ApiClientError } from "@/lib/api/client";

export function NotifyProgramPlottedButton({
  academicPeriodId,
  periodLabel,
  programId,
  programLabel,
  className,
}: {
  academicPeriodId?: string | null;
  periodLabel?: string | null;
  programId?: string | null;
  programLabel?: string | null;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function notify() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await collegeApi.notifyProgramPlotted({
        academicPeriodId: academicPeriodId?.trim() || undefined,
        programId: programId?.trim() || undefined,
        note: periodLabel ? `Term: ${periodLabel}` : undefined,
      });
      setMsg(
        res.message ??
          `College Admin has been notified which section(s) in ${programLabel || "this program"} are ready for double-check.`,
      );
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to notify College Admin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <Button type="button" variant="outline" disabled={busy} onClick={() => void notify()}>
        {busy ? "Notifying College Admin…" : "Notify College Admin: sections ready for check"}
      </Button>
      {msg ? <p className="mt-2 text-[12px] text-emerald-800">{msg}</p> : null}
      {err ? <p className="mt-2 text-[12px] text-red-700">{err}</p> : null}
    </div>
  );
}
