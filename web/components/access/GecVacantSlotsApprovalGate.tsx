"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GecVacantSlotApprovalUiState } from "@/components/access/RequestAccessPanel";

type Props = {
  state: GecVacantSlotApprovalUiState;
  loading?: boolean;
  /** When set, reflects vacant-slot access for this college only. */
  collegeId?: string | null;
};

/** Compact status for vacant GEC editing in the Central Hub (per college). */
export function GecVacantSlotsApprovalGate({ state, loading, collegeId }: Props) {
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

  if (state.status === "rejected") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950 no-print" role="status">
        Request not approved for this college.
        <Button type="button" asChild size="sm" className="ml-3 bg-[#780301] hover:bg-[#5a0201] align-middle">
          <Link href="/admin/gec/request-access">Request again</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-black/80 no-print flex flex-wrap items-center gap-2">
      <span>Read-only for vacant GEC edits — request access for this college.</span>
      <Button type="button" asChild size="sm" className="bg-[#FF990A] hover:bg-[#e88909] text-white">
        <Link href="/admin/gec/request-access">
          <KeyRound className="w-3.5 h-3.5 mr-1 inline" />
          Request
        </Link>
      </Button>
    </div>
  );
}
