"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ScheduleLoadJustification } from "@/types/db";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type DoiPolicyReviewRowVM = ScheduleLoadJustification & {
  collegeName: string;
  periodName: string;
  facultyName?: string | null;
  facultyWeeklyHours?: number | null;
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

function mergeVm(base: DoiPolicyReviewRowVM, updated: ScheduleLoadJustification): DoiPolicyReviewRowVM {
  return {
    ...base,
    ...updated,
    collegeName: base.collegeName,
    periodName: base.periodName,
    facultyName: base.facultyName,
    facultyWeeklyHours: base.facultyWeeklyHours,
  };
}

function ReviewCard({
  row,
  onRowUpdated,
}: {
  row: DoiPolicyReviewRowVM;
  onRowUpdated: (next: DoiPolicyReviewRowVM) => void;
}) {
  const router = useRouter();
  const [note, setNote] = useState(row.doiReviewNote ?? "");
  const [busy, setBusy] = useState<"accepted" | "rejected" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const pending = row.doiDecision == null || row.doiDecision === "pending";

  async function submit(decision: "accepted" | "rejected") {
    setBusy(decision);
    setMsg(null);
    try {
      const res = await fetch("/api/doi/policy-justification-review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          justificationId: row.id,
          decision,
          note: note.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        justification?: ScheduleLoadJustification;
        error?: string;
        warning?: string;
      } | null;
      if (!res.ok) {
        setMsg(data?.error ?? "Request failed.");
        return;
      }
      if (data?.justification) {
        onRowUpdated(mergeVm(row, data.justification));
      }
      if (data?.warning) {
        setMsg(data.warning);
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const snap = row.violationsSnapshot as { facultyWeeklyHours?: number | null } | null;
  const hours = row.facultyWeeklyHours ?? (snap?.facultyWeeklyHours ?? null);
  const facultyLabel = (row.facultyName ?? "").trim() || (row.facultyUserId ? "Selected instructor" : "Instructor");

  return (
    <li className="rounded-xl border border-black/10 bg-white shadow-sm p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-black/50">
          <span>{row.collegeName}</span>
          <span>·</span>
          <span>{row.periodName}</span>
          <span>·</span>
          <span>Updated {new Date(row.updatedAt).toLocaleString()}</span>
        </div>
        <span
          className={`text-[11px] font-bold uppercase px-2 py-1 rounded-md border ${decisionBadgeClass(row.doiDecision ?? null)}`}
        >
          {decisionLabel(row.doiDecision ?? null)}
        </span>
      </div>
      {row.doiReviewedAt ? (
        <p className="text-xs text-black/55">
          <span className="font-semibold text-black/60">Reviewed: </span>
          {new Date(row.doiReviewedAt).toLocaleString()}
        </p>
      ) : null}
      <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2">
        <div className="text-sm font-semibold text-[#181818]">
          {facultyLabel}
          {hours != null ? (
            <span className="font-normal text-black/70">
              {" "}
              has <span className="font-semibold">{hours.toFixed(1)}</span> hours per week
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-black/70">
          {hours != null
            ? "This is above the standard teaching load."
            : "This submission explains why the teaching load is above the standard."}
        </p>
        <div className="mt-1 text-xs text-black/55">
          <span className="font-semibold text-black/60">Submitted by: </span>
          <span className="font-medium">{row.authorName}</span>
        </div>
      </div>
      <div className="text-sm text-black/80 whitespace-pre-wrap border-t border-black/5 pt-3">{row.justification}</div>
      {row.doiReviewNote && !pending ? (
        <div className="text-xs text-black/55">
          <span className="font-semibold">VPAA note: </span>
          {row.doiReviewNote}
        </div>
      ) : null}

      {pending ? (
        <div className="border-t border-black/5 pt-3 space-y-2">
          <label className="block text-[12px] font-medium text-black/70">Optional note (visible to chair and college)</label>
          <textarea
            className="w-full min-h-[72px] rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write a short note if needed."
          />
          {msg ? <p className="text-xs text-amber-800">{msg}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              disabled={busy !== null}
              onClick={() => void submit("accepted")}
            >
              {busy === "accepted" ? "Saving…" : "Accept justification"}
            </Button>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void submit("rejected")}>
              {busy === "rejected" ? "Saving…" : "Reject"}
            </Button>
          </div>
          <p className="text-[11px] text-black/45 leading-relaxed">
            The chairman and college admins are notified immediately. This list and the college view update in real time.
          </p>
        </div>
      ) : (
        <p className="text-xs text-black/50 border-t border-black/5 pt-3">Decision recorded — no further action.</p>
      )}
    </li>
  );
}

export function DoiPolicyReviewsClient({ rows: initialRows }: { rows: DoiPolicyReviewRowVM[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<DoiPolicyReviewRowVM[]>(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  // Campus-wide queue: any change (new submission or VPAA decision) should refresh server props; local state merges PATCH response for instant UI.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel("doi-policy-slj-all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ScheduleLoadJustification" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-8 text-sm text-black/60">
        No submissions yet. When a chair submits a teaching-load explanation, it will appear here for review.
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {rows.map((r) => (
        <ReviewCard
          key={r.id}
          row={r}
          onRowUpdated={(next) => setRows((prev) => prev.map((x) => (x.id === next.id ? next : x)))}
        />
      ))}
    </ul>
  );
}
