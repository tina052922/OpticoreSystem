import { cookies } from "next/headers";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { CollegePolicyReviewsClient, type CollegePolicyReviewRowVM } from "@/components/policy/CollegePolicyReviewsClient";
import { requireRoles } from "@/lib/auth/require-role";
import { apiFetch } from "@/lib/api/client";
import type { AcademicPeriod, College, ScheduleLoadJustification } from "@/types/db";

export default async function CollegePolicyReviewsPage() {
  const profile = await requireRoles(["college_admin"]);
  let rows: ScheduleLoadJustification[] = [];
  let colleges: College[] = [];
  let periods: AcademicPeriod[] = [];
  const facultyLabelByUserId = new Map<string, string>();

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const opts = { method: "GET" as const, cookieHeader };

    const [reviewsRes, collegesRes, semestersRes, facultyRes] = await Promise.all([
      apiFetch<{ reviews: ScheduleLoadJustification[] }>("/api/policies/reviews", opts),
      apiFetch<{ colleges: College[] }>("/api/catalog/colleges?extended=true", opts),
      apiFetch<{ semesters: AcademicPeriod[] }>("/api/semesters", opts),
      apiFetch<{ profiles: { userId: string; fullName: string; aka: string | null }[] }>(
        "/api/catalog/faculty-profiles/ins-names", opts,
      ),
    ]);

    rows = reviewsRes.reviews ?? [];
    colleges = collegesRes.colleges ?? [];
    periods = semestersRes.semesters ?? [];

    for (const fp of facultyRes.profiles ?? []) {
      const label = fp.aka?.trim() || fp.fullName?.trim() || fp.userId;
      facultyLabelByUserId.set(fp.userId, label);
    }
  } catch {
    return <p className="text-sm text-red-700">Failed to load policy reviews.</p>;
  }

  const collegeById = new Map(colleges.map((c) => [c.id, c]));
  const periodById = new Map(periods.map((p) => [p.id, p]));

  const vms: CollegePolicyReviewRowVM[] = rows.map((r) => ({
    ...r,
    collegeName: collegeById.get(r.collegeId)?.name ?? r.collegeId,
    periodName: periodById.get(r.academicPeriodId)?.name ?? r.academicPeriodId,
    instructorLabel: r.facultyUserId ? facultyLabelByUserId.get(r.facultyUserId) ?? r.facultyUserId : null,
  }));

  return (
    <div>
      <ChairmanPageHeader title="Policy reviews" />
      <div className="px-4 sm:px-6 lg:px-8 pb-10 max-w-5xl mx-auto">
        <CollegePolicyReviewsClient rows={vms} realtimeCollegeId={profile.collegeId} />
      </div>
    </div>
  );
}
