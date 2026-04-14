"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ScheduleLoadJustification } from "@/types/db";
import { Button } from "@/components/ui/button";

export type DoiPolicyReviewRowVM = ScheduleLoadJustification & {
  collegeName: string;
  periodName: string;
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

function ReviewCard({ row }: { row: DoiPolicyReviewRowVM }) {
  const router = useRouter();
  const [note, setNote] = useState(row.doiReviewNote ?? "");
  const [busy, setBusy] = useState<"accepted" | "rejected" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

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
      const data = (await res.json().catch(() => null)) as { error?: string; warning?: string } | null;
      if (!res.ok) {
        setMsg(data?.error ?? "Request failed.");
        return;
      }
      if (data && "warning" in data && typeof data.warning === "string") {
        setMsg(data.warning);
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const snap = row.violationsSnapshot as { summary?: string } | null;

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
      <div className="text-sm">
        <span className="text-black/50">Chair / author: </span>
        <span className="font-medium">{row.authorName}</span>
        {row.authorEmail ? <span className="text-black/60"> ({row.authorEmail})</span> : null}
      </div>
      <div className="text-sm text-black/80 whitespace-pre-wrap border-t border-black/5 pt-3">{row.justification}</div>
      {snap && typeof snap === "object" && "summary" in snap && snap.summary ? (
        <div className="text-xs text-black/50 font-mono bg-black/[0.03] rounded p-2">{snap.summary}</div>
      ) : null}
      {row.doiReviewNote && row.doiDecision ? (
        <div className="text-xs text-black/55">
          <span className="font-semibold">VPAA note: </span>
          {row.doiReviewNote}
        </div>
      ) : null}

      <div className="border-t border-black/5 pt-3 space-y-2">
        <label className="block text-[12px] font-medium text-black/70">Review note (optional, shown to chair)</label>
        <textarea
          className="w-full min-h-[72px] rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Accepted overload for this term only; reduce load next semester."
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
          Accepting documents VPAA awareness of the overload; term publication and locking still use INS → VPAA
          approval. Rejecting notifies the chair to revise the draft or justification.
        </p>
      </div>
    </li>
  );
}

export function DoiPolicyReviewsClient({ rows }: { rows: DoiPolicyReviewRowVM[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-8 text-sm text-black/60">
        No submissions yet. When a chairman saves a load justification from the Evaluator (policy violations), it
        appears here for VPAA review.
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {rows.map((r) => (
        <ReviewCard key={r.id} row={r} />
      ))}
    </ul>
  );
}
