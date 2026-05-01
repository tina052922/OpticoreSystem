"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ScheduleLoadJustification } from "@/types/db";

export type CollegePolicyItemVM = {
  row: ScheduleLoadJustification;
  collegeName: string;
  periodName: string;
  instructorLabel: string | null;
};

function decisionLabel(d: ScheduleLoadJustification["doiDecision"]): string {
  if (d === "accepted") return "Accepted";
  if (d === "rejected") return "Rejected";
  if (d === "pending") return "Pending";
  return "Not reviewed";
}

function decisionBadgeClass(d: ScheduleLoadJustification["doiDecision"]): string {
  if (d === "accepted") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (d === "rejected") return "bg-red-100 text-red-900 border-red-200";
  if (d === "pending") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-black/[0.04] text-black/60 border-black/10";
}

function isPending(d: ScheduleLoadJustification["doiDecision"] | null | undefined): boolean {
  return d == null || d === "pending";
}

type Filter = "all" | "pending" | "decided";

/**
 * College Admin policy list: filter chips + Supabase Realtime so VPAA decisions appear without a manual refresh.
 */
export function CollegePolicyJustificationsClient({
  collegeId,
  items,
}: {
  collegeId: string;
  items: CollegePolicyItemVM[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("pending");

  const pendingCount = useMemo(
    () => items.filter((it) => isPending(it.row.doiDecision)).length,
    [items],
  );

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const p = isPending(it.row.doiDecision);
      if (filter === "pending") return p;
      if (filter === "decided") return !p;
      return true;
    });
  }, [items, filter]);

  useEffect(() => {
    const id = collegeId?.trim();
    if (!id) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`college-policy-slj:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ScheduleLoadJustification", filter: `collegeId=eq.${id}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [collegeId, router]);

  const chip = (f: Filter, label: string, count?: number) => (
    <button
      key={f}
      type="button"
      onClick={() => setFilter(f)}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
        filter === f
          ? "bg-[#FF990A] text-white border-[#e88909]"
          : "bg-white text-black/70 border-black/15 hover:bg-black/[0.04]"
      }`}
    >
      {label}
      {typeof count === "number" ? (
        <span className={`ml-1 tabular-nums ${filter === f ? "text-white/90" : "text-[#DE0602]"}`}>({count})</span>
      ) : null}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {chip("pending", "Pending VPAA review", pendingCount)}
        {chip("decided", "Decided", items.length - pendingCount)}
        {chip("all", "All", items.length)}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-black/10 bg-white p-8 text-sm text-black/60">
          {filter === "pending"
            ? "No pending justifications. When a chair submits a load-policy note, it will appear here until VPAA reviews it."
            : "No items match this filter."}
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map(({ row: r, collegeName, periodName, instructorLabel }) => {
            const snap = r.violationsSnapshot as { summary?: string } | null;
            return (
              <li key={r.id} className="rounded-xl border border-black/10 bg-white shadow-sm p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-black/50">
                    <span>{collegeName}</span>
                    <span>·</span>
                    <span>{periodName}</span>
                    <span>·</span>
                    <span>Updated {new Date(r.updatedAt).toLocaleString()}</span>
                  </div>
                  <span
                    className={`text-[11px] font-bold uppercase px-2 py-1 rounded-md border ${decisionBadgeClass(r.doiDecision ?? null)}`}
                  >
                    {decisionLabel(r.doiDecision ?? null)}
                  </span>
                </div>
                {r.doiReviewedAt ? (
                  <p className="text-xs text-black/55">
                    <span className="font-semibold text-black/60">VPAA reviewed: </span>
                    {new Date(r.doiReviewedAt).toLocaleString()}
                  </p>
                ) : null}
                <div className="text-sm">
                  <span className="text-black/50">Author: </span>
                  <span className="font-medium">{r.authorName}</span>
                  {r.authorEmail ? <span className="text-black/60"> ({r.authorEmail})</span> : null}
                </div>
                {instructorLabel ? (
                  <div className="text-sm text-black/80">
                    <span className="text-black/50">Instructor: </span>
                    <span className="font-medium">{instructorLabel}</span>
                  </div>
                ) : null}
                {r.scheduleEntryId ? (
                  <div className="text-xs text-black/55">
                    <span className="font-semibold text-black/60">Schedule entry: </span>
                    <span className="font-mono">{r.scheduleEntryId}</span>
                  </div>
                ) : null}
                <div className="text-sm text-black/80 whitespace-pre-wrap border-t border-black/5 pt-3">{r.justification}</div>
                {snap && typeof snap === "object" && "summary" in snap && snap.summary ? (
                  <div className="text-xs text-black/50 font-mono bg-black/[0.03] rounded p-2">{snap.summary}</div>
                ) : null}
                {r.doiReviewNote && r.doiDecision ? (
                  <div className="text-xs text-black/55">
                    <span className="font-semibold">VPAA note: </span>
                    {r.doiReviewNote}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
