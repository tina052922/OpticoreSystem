import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
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
  const { data: users } = await supabase.from("User").select("id,name");

  const collegeById = new Map((colleges as College[] | null)?.map((c) => [c.id, c]) ?? []);
  const periodById = new Map((periods as AcademicPeriod[] | null)?.map((p) => [p.id, p]) ?? []);
  const userNameById = new Map((users as Array<{ id: string; name: string }> | null)?.map((u) => [u.id, u.name]) ?? []);

  if (error) {
    return <p className="text-sm text-red-700">{error.message}</p>;
  }

  const list = (rows ?? []) as ScheduleLoadJustification[];
  const facultyIds = [...new Set(list.map((r) => r.facultyUserId).filter(Boolean))] as string[];
  const facultyLabelByUserId = new Map<string, string>();
  if (facultyIds.length > 0) {
    const { data: fps } = await supabase
      .from("FacultyProfile")
      .select("userId,fullName,aka")
      .in("userId", facultyIds);
    for (const fp of fps ?? []) {
      const row = fp as { userId: string; fullName: string; aka: string | null };
      const label = row.aka?.trim() || row.fullName?.trim() || row.userId;
      facultyLabelByUserId.set(row.userId, label);
    }
  }

  const vms: DoiPolicyReviewRowVM[] = list.map((r) => ({
    ...r,
    collegeName: collegeById.get(r.collegeId)?.name ?? r.collegeId,
    periodName: periodById.get(r.academicPeriodId)?.name ?? r.academicPeriodId,
    facultyName: r.facultyUserId
      ? facultyLabelByUserId.get(r.facultyUserId) ?? userNameById.get(r.facultyUserId) ?? null
      : null,
    facultyWeeklyHours:
      r.violationsSnapshot && typeof r.violationsSnapshot === "object" && r.violationsSnapshot !== null && "facultyWeeklyHours" in r.violationsSnapshot
        ? (r.violationsSnapshot as { facultyWeeklyHours?: number | null }).facultyWeeklyHours ?? null
        : null,
  }));

  return (
    <div>
      <ChairmanPageHeader
        title="Policy reviews"
        subtitle="Review teaching-load justifications from all colleges. Accept or reject each submission — the chair and college admin are notified immediately; lists update in real time."
      />
      <div className="px-4 sm:px-6 lg:px-8 pb-10 max-w-5xl mx-auto">
        <DoiPolicyReviewsClient rows={vms} />
      </div>
    </div>
  );
}
