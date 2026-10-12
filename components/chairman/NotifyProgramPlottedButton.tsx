"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { collegeApi } from "@/lib/api/client";
import { useActionToast } from "@/components/alerts/useActionToast";

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
  const toast = useActionToast();
  const [err, setErr] = useState<string | null>(null);

  async function notify() {
    setBusy(true);
    setErr(null);
    try {
      const res = await collegeApi.notifyProgramPlotted({
        academicPeriodId: academicPeriodId?.trim() || undefined,
        programId: programId?.trim() || undefined,
        note: periodLabel ? `Term: ${periodLabel}` : undefined,
      });
      toast.ok(
        "College Admin notified",
        res.message ??
          `They have been told which sections in ${programLabel || "this program"} are ready for double-check.`,
      );
    } catch (e) {
      toast.fail(e, "Could not notify College Admin", "notify: program plotted");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <Button type="button" variant="outline" disabled={busy} onClick={() => void notify()}>
        {busy ? "Notifying College Admin…" : "Notify College Admin: sections ready for check"}
      </Button>
      {err ? <p className="mt-2 text-[12px] text-red-700">{err}</p> : null}
    </div>
  );
}
