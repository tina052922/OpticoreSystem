import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Q } from "@/lib/supabase/catalog-columns";
import type { ScheduleLoadJustification, College, AcademicPeriod } from "@/types/db";

export default async function DoiReviewsPage() {
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

  const collegeById = new Map((colleges as College[] | null)?.map((c) => [c.id, c]) ?? []);
  const periodById = new Map((periods as AcademicPeriod[] | null)?.map((p) => [p.id, p]) ?? []);

  if (error) {
    return <p className="text-sm text-red-700">{error.message}</p>;
  }

  const list = (rows ?? []) as ScheduleLoadJustification[];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#181818]">Faculty load policy reviews</h1>
        <p className="text-sm text-black/60 mt-1">
          Justifications submitted by college chairs when timetables exceed Faculty Manual teaching-load rules (VPAA /
          DOI visibility).
        </p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-black/10 bg-white p-8 text-sm text-black/60">
          No submissions yet. When a chairman saves a schedule with policy violations, their justification appears
          here.
        </div>
      ) : (
        <ul className="space-y-4">
          {list.map((r) => {
            const col = collegeById.get(r.collegeId);
            const ap = periodById.get(r.academicPeriodId);
            const snap = r.violationsSnapshot as { summary?: string } | null;
            return (
              <li
                key={r.id}
                className="rounded-xl border border-black/10 bg-white shadow-sm p-5 space-y-3"
              >
                <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-black/50">
                  <span>{col?.name ?? r.collegeId}</span>
                  <span>·</span>
                  <span>{ap?.name ?? r.academicPeriodId}</span>
                  <span>·</span>
                  <span>Updated {new Date(r.updatedAt).toLocaleString()}</span>
                </div>
                <div className="text-sm">
                  <span className="text-black/50">Chair / author: </span>
                  <span className="font-medium">{r.authorName}</span>
                  {r.authorEmail ? <span className="text-black/60"> ({r.authorEmail})</span> : null}
                </div>
                <div className="text-sm text-black/80 whitespace-pre-wrap border-t border-black/5 pt-3">
                  {r.justification}
                </div>
                {snap && typeof snap === "object" && "summary" in snap && snap.summary ? (
                  <div className="text-xs text-black/50 font-mono bg-black/[0.03] rounded p-2">{snap.summary}</div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
