"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accessRequestsApi, ApiClientError } from "@/lib/api/client";
import type { GecVacantSlotApprovalUiState } from "@/components/access/RequestAccessPanel";

type Props = {
  state: GecVacantSlotApprovalUiState;
  loading?: boolean;
  collegeId?: string | null;
  onSubmitted?: () => void;
};

export function GecVacantSlotsApprovalGate({ state, loading, collegeId, onSubmitted }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!collegeId) return;
    setBusy(true);
    setError(null);
    try {
      await accessRequestsApi.create({
        targetCollegeId: collegeId,
        scopes: ["gec_vacant_slots"],
        note: "Central Hub Evaluator — vacant GEC slots for this college",
      });
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  if (!collegeId) return null;

  if (loading) {
    return (
      <div
        className="rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black/60 no-print"
        role="status"
        aria-live="polite"
      >
        Loading access…
      </div>
    );
  }

  if (state.status === "approved") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-950 no-print" role="status">
        Vacant-slot access approved for this college.
        <Button type="button" asChild variant="outline" size="sm" className="ml-3 border-emerald-300 bg-white align-middle">
          <Link href="/admin/gec/request-access">Requests</Link>
        </Button>
      </div>
    );
  }

  if (state.status === "pending") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 no-print" role="status">
        Approval pending for this college.
        <Button type="button" asChild variant="outline" size="sm" className="ml-3 border-amber-300 bg-white align-middle">
          <Link href="/admin/gec/request-access">
            <KeyRound className="w-3.5 h-3.5 mr-1 inline" />
            Status
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-black/80 no-print space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          {state.status === "rejected"
            ? "Request not approved for this college."
            : "Read-only for vacant GEC edits — request access for this college."}
        </span>
        <Button
          type="button"
          size="sm"
          className="bg-[#FF990A] hover:bg-[#e88909] text-white"
          disabled={busy}
          onClick={() => void submit()}
        >
          <KeyRound className="w-3.5 h-3.5 mr-1 inline" />
          {busy ? "Submitting…" : state.status === "rejected" ? "Request again" : "Request access"}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
