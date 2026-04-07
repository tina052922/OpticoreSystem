"use client";

import Link from "next/link";
import { KeyRound, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GecVacantSlotApprovalUiState } from "@/components/access/RequestAccessPanel";

type Props = {
  /** From `getGecVacantSlotApprovalUiState` — drives banner copy and CTAs. */
  state: GecVacantSlotApprovalUiState;
  /** While access requests are loading, show a neutral placeholder. */
  loading?: boolean;
};

/**
 * Prominent approval gate for the Vacant GEC slots page: explains limited edit rights and routes users
 * to submit or track College Admin approval before editing vacant cells.
 */
export function GecVacantSlotsApprovalGate({ state, loading }: Props) {
  if (loading) {
    return (
      <div
        className="rounded-xl border border-black/10 bg-black/[0.03] px-4 py-6 text-sm text-black/60"
        role="status"
        aria-live="polite"
      >
        Loading approval status…
      </div>
    );
  }

  if (state.status === "approved") {
    return (
      <div
        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 sm:px-6 shadow-sm"
        role="status"
      >
        <p className="text-sm font-semibold text-emerald-950">
          Approved — you can now edit vacant GEC slots
        </p>
        <p className="text-sm text-emerald-900/90 mt-2">
          Your temporary <code className="rounded bg-black/[0.06] px-1 text-[13px]">gec_vacant_slots</code> grant is
          active. Only <strong>vacant</strong> rows are editable; occupied slots and other programs&apos; schedules stay
          read-only.
        </p>
      </div>
    );
  }

  if (state.status === "pending") {
    return (
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 sm:px-6 shadow-sm"
        role="status"
      >
        <p className="text-sm font-semibold text-amber-950">Approval pending</p>
        <p className="text-sm text-amber-950/90 mt-2">
          College Admin has not approved your vacant-slot request yet. This page stays <strong>read-only</strong> until
          approval. You will be notified in Inbox when the status changes.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" asChild variant="outline" className="border-amber-300 bg-white">
            <Link href="/admin/gec/request-access">
              <KeyRound className="w-4 h-4 mr-2" />
              View or amend request
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (state.status === "rejected") {
    return (
      <div
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-5 sm:px-6 shadow-sm"
        role="status"
      >
        <div className="flex gap-2 items-start">
          <ShieldAlert className="w-5 h-5 text-red-800 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-red-950">Request not approved</p>
            <p className="text-sm text-red-950/90 mt-2">
              Your vacant-slot request was declined
              {state.reviewedAt ? ` (${new Date(state.reviewedAt).toLocaleString()})` : ""}. You may submit a new
              request with additional context. This page remains read-only for edits.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" asChild className="bg-[#780301] hover:bg-[#5a0201]">
            <Link href="/admin/gec/request-access">
              <KeyRound className="w-4 h-4 mr-2" />
              Request approval again
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /* idle — no pending/approved/rejected grant for vacant slots */
  return (
    <div className="rounded-xl border border-black/10 bg-white px-4 py-5 sm:px-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-black/90 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#780301]" aria-hidden />
            Read-only — approval required to edit vacant slots
          </p>
          <p className="text-sm text-black/70 mt-2 max-w-2xl">
            GEC Chairman cannot edit schedules directly without College Admin approval. Submit a{" "}
            <strong>Request approval for vacant slots</strong> first; after approval, only <strong>vacant</strong> GEC
            cells become editable (never occupied slots or other programs).
          </p>
        </div>
        <Button type="button" asChild className="shrink-0 bg-[#FF990A] hover:bg-[#e88909] text-white font-semibold">
          <Link href="/admin/gec/request-access">
            <KeyRound className="w-4 h-4 mr-2" />
            Request approval for vacant slots
          </Link>
        </Button>
      </div>
    </div>
  );
}
