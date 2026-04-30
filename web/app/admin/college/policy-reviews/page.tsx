import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Q } from "@/lib/supabase/catalog-columns";
import type { AcademicPeriod, College, ScheduleLoadJustification } from "@/types/db";

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

export default async function CollegePolicyReviewsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <p className="text-sm text-red-700">Supabase is not configured.</p>;
  }

  const { data: rows, error } = await supabase
    .from("ScheduleLoadJustification")
    .select(Q.scheduleLoadJustification)
    .order("updatedAt", { ascending: false });

  const { data: colleges } = await supabase.from("College").select(Q.college);
  const { data: periods } = await supabase.from("AcademicPeriod").select(Q.academicPeriod);

  if (error) {
    return <p className="text-sm text-red-700">{error.message}</p>;
  }

  const collegeById = new Map((colleges as College[] | null)?.map((c) => [c.id, c]) ?? []);
  const periodById = new Map((periods as AcademicPeriod[] | null)?.map((p) => [p.id, p]) ?? []);
  const list = (rows ?? []) as ScheduleLoadJustification[];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#181818]">Policy justifications</h1>
        <p className="text-sm text-black/60 mt-1">
          Read-only view of chair-submitted load-policy justifications for your college and term. DOI/VPAA decisions (if
          any) appear here after review.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-black/10 bg-white p-8 text-sm text-black/60">
          No submissions yet. When a chairman saves a schedule that exceeds faculty load policy, the justification
          appears here (and in DOI Policy Reviews).
        </div>
      ) : (
        <ul className="space-y-4">
          {list.map((r) => {
            const snap = r.violationsSnapshot as { summary?: string } | null;
            const collegeName = collegeById.get(r.collegeId)?.name ?? r.collegeId;
            const periodName = periodById.get(r.academicPeriodId)?.name ?? r.academicPeriodId;
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
                <div className="text-sm">
                  <span className="text-black/50">Author: </span>
                  <span className="font-medium">{r.authorName}</span>
                  {r.authorEmail ? <span className="text-black/60"> ({r.authorEmail})</span> : null}
                </div>
                <div className="text-sm text-black/80 whitespace-pre-wrap border-t border-black/5 pt-3">
                  {r.justification}
                </div>
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

