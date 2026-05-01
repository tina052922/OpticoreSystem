import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Q } from "@/lib/supabase/catalog-columns";
import type { ScheduleLoadJustification, College, AcademicPeriod } from "@/types/db";
import { DoiPolicyReviewsClient, type DoiPolicyReviewRowVM } from "@/components/doi/DoiPolicyReviewsClient";

/**
 * Server-loaded VPAA queue: all `ScheduleLoadJustification` rows (RLS: campus-wide for DOI).
 * Rendered only on the DOI Campus Intelligence dashboard — no separate sidebar route.
 */
export async function DoiPolicyJustificationsPanel() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <p className="text-sm text-red-700 px-6 max-w-6xl mx-auto">
        Supabase is not configured; policy reviews cannot load.
      </p>
    );
  }

  const { data: rows, error } = await supabase
    .from("ScheduleLoadJustification")
    .select(Q.scheduleLoadJustification)
    .order("updatedAt", { ascending: false });

  const { data: colleges } = await supabase.from("College").select(Q.college);
  const { data: periods } = await supabase.from("AcademicPeriod").select(Q.academicPeriod);

  if (error) {
    return <p className="text-sm text-red-700 px-6 max-w-6xl mx-auto">{error.message}</p>;
  }

  const collegeById = new Map((colleges as College[] | null)?.map((c) => [c.id, c]) ?? []);
  const periodById = new Map((periods as AcademicPeriod[] | null)?.map((p) => [p.id, p]) ?? []);
  const list = (rows ?? []) as ScheduleLoadJustification[];

  const facultyIds = [...new Set(list.map((r) => r.facultyUserId).filter(Boolean))] as string[];
  const facultyNameByUserId = new Map<string, string>();
  if (facultyIds.length > 0) {
    const { data: fps } = await supabase
      .from("FacultyProfile")
      .select("userId,fullName,aka")
      .in("userId", facultyIds);
    for (const fp of fps ?? []) {
      const row = fp as { userId: string; fullName: string; aka: string | null };
      facultyNameByUserId.set(row.userId, row.aka?.trim() || row.fullName?.trim() || row.userId);
    }
  }

  const vms: DoiPolicyReviewRowVM[] = list.map((r) => ({
    ...r,
    collegeName: collegeById.get(r.collegeId)?.name ?? r.collegeId,
    periodName: periodById.get(r.academicPeriodId)?.name ?? r.academicPeriodId,
    facultyName: r.facultyUserId ? facultyNameByUserId.get(r.facultyUserId) ?? null : null,
    facultyWeeklyHours:
      r.violationsSnapshot && typeof r.violationsSnapshot === "object" && r.violationsSnapshot !== null && "facultyWeeklyHours" in r.violationsSnapshot
        ? (r.violationsSnapshot as { facultyWeeklyHours?: number | null }).facultyWeeklyHours ?? null
        : null,
  }));

  const pendingCount = vms.filter((r) => r.doiDecision == null || r.doiDecision === "pending").length;

  return (
    <section
      id="policy-justifications"
      className="px-6 max-w-6xl mx-auto scroll-mt-[120px] border-t border-black/10 pt-10 mt-10"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#181818] flex flex-wrap items-center gap-2">
          Policy justifications
          {pendingCount > 0 ? (
            <span className="text-sm font-bold text-white bg-[#DE0602] px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
              {pendingCount > 99 ? "99+" : pendingCount} pending
            </span>
          ) : null}
        </h2>
        <p className="text-sm text-black/60 mt-1 max-w-3xl">
          Chairs submit explanations when teaching load exceeds policy. Accept or reject here; the chairman and college
          admins are notified, and statuses update across the campus in real time.
        </p>
      </div>

      <DoiPolicyReviewsClient rows={vms} />
    </section>
  );
}
