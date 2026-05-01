import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { CollegePolicyJustificationsClient } from "@/components/college/CollegePolicyJustificationsClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRoles } from "@/lib/auth/require-role";
import { Q } from "@/lib/supabase/catalog-columns";
import type { AcademicPeriod, College, ScheduleLoadJustification } from "@/types/db";

export default async function CollegePolicyReviewsPage() {
  const profile = await requireRoles(["college_admin"]);

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

  const items = list.map((r) => ({
    row: r,
    collegeName: collegeById.get(r.collegeId)?.name ?? r.collegeId,
    periodName: periodById.get(r.academicPeriodId)?.name ?? r.academicPeriodId,
    instructorLabel: r.facultyUserId
      ? (facultyLabelByUserId.get(r.facultyUserId) ?? r.facultyUserId)
      : null,
  }));

  const pendingN = items.filter((it) => it.row.doiDecision == null || it.row.doiDecision === "pending").length;

  return (
    <div>
      <ChairmanPageHeader
        title="Policy reviews"
        subtitle={`Load-policy justifications from your college (${pendingN} awaiting VPAA when pending). You are notified when VPAA accepts or rejects; this list updates live.`}
      />
      <div className="px-4 sm:px-6 lg:px-8 pb-10 max-w-5xl mx-auto">
        {profile.collegeId ? (
          <CollegePolicyJustificationsClient collegeId={profile.collegeId} items={items} />
        ) : (
          <p className="text-sm text-red-700">Your account has no college scope.</p>
        )}
      </div>
    </div>
  );
}
