"use client";

import { useEffect, useState } from "react";
import { chairAssignmentsApi, type ChairAssignmentProgram } from "@/lib/api/client";
import { useActionToast } from "@/components/alerts/useActionToast";

/**
 * Shown to a chairperson who holds several programs (e.g. every BIT major — Chairperson Assignment).
 * Switching changes which program their Subject Scheduler, Faculty Profile and Subject Codes open on;
 * it never changes any schedule. Hidden for a chairperson with one program.
 */
export function ChairProgramSwitcher() {
  const toast = useActionToast();
  const [programs, setPrograms] = useState<ChairAssignmentProgram[]>([]);
  const [active, setActive] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    chairAssignmentsApi
      .mine()
      .then((r) => {
        if (!alive) return;
        setPrograms(r.programs ?? []);
        setActive(r.activeProgramId ?? "");
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (programs.length < 2) return null;

  return (
    <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#780301]/20 bg-[#780301]/[0.04] px-3 py-2 text-[13px] sm:mx-6 lg:mx-8">
      <span className="font-semibold text-[#780301]">Managing</span>
      <select
        className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[13px]"
        value={active}
        disabled={busy}
        onChange={async (e) => {
          const next = e.target.value;
          setBusy(true);
          try {
            await chairAssignmentsApi.setMyActiveProgram(next);
            setActive(next);
            // Every page reads the active program on load.
            window.location.reload();
          } catch (err) {
            toast.fail(err, "Could not switch program", "chair: switch program");
            setBusy(false);
          }
        }}
      >
        {programs.map((p) => (
          <option key={p.id} value={p.id}>
            {[p.code, p.name].filter(Boolean).join(" — ")}
          </option>
        ))}
      </select>
      <span className="text-[11px] text-black/55">You chair {programs.length} programs; pick the one to work on.</span>
    </div>
  );
}
