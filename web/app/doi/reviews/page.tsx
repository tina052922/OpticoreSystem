import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Q } from "@/lib/supabase/catalog-columns";
import type { ScheduleLoadJustification, College, AcademicPeriod } from "@/types/db";
import { DoiPolicyReviewsClient, type DoiPolicyReviewRowVM } from "@/components/doi/DoiPolicyReviewsClient";

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
  const vms: DoiPolicyReviewRowVM[] = list.map((r) => ({
    ...r,
    collegeName: collegeById.get(r.collegeId)?.name ?? r.collegeId,
    periodName: periodById.get(r.academicPeriodId)?.name ?? r.academicPeriodId,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#181818]">Faculty load policy reviews</h1>
        <p className="text-sm text-black/60 mt-1">
          Justifications submitted by college chairs when timetables exceed Faculty Manual teaching-load rules. Record
          an accept or reject decision; the author is notified. Schedules remain visible in the Central Hub; there is no
          DOI workflow inbox.
        </p>
      </div>

      <DoiPolicyReviewsClient rows={vms} />
    </div>
  );
}
