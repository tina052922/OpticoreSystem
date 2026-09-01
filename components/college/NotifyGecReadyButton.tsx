"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { collegeApi, ApiClientError } from "@/lib/api/client";

export function NotifyGecReadyButton({
  academicPeriodId,
  periodLabel,
  className,
}: {
  academicPeriodId?: string | null;
  periodLabel?: string | null;
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
      const res = await collegeApi.notifyGecReady({
        academicPeriodId: academicPeriodId?.trim() || undefined,
        note: periodLabel ? `Term: ${periodLabel}` : undefined,
      });
      setMsg(res.message ?? "GEC Chairman has been notified that this college is ready for GEC plotting.");
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Failed to notify GEC.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <Button type="button" variant="outline" disabled={busy} onClick={() => void notify()}>
        {busy ? "Notifying GEC…" : "Notify GEC: college ready for plotting"}
      </Button>
      {msg ? <p className="mt-2 text-[12px] text-emerald-800">{msg}</p> : null}
      {err ? <p className="mt-2 text-[12px] text-red-700">{err}</p> : null}
    </div>
  );
}
