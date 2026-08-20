import { cookies } from "next/headers";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { apiFetch } from "@/lib/api/client";
import type { ScheduleLoadJustification, College, AcademicPeriod } from "@/types/db";
import { DoiPolicyReviewsClient, type DoiPolicyReviewRowVM } from "@/components/doi/DoiPolicyReviewsClient";

export default async function DoiReviewsPage() {
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

  const vms: DoiPolicyReviewRowVM[] = rows.map((r) => ({
    ...r,
    collegeName: collegeById.get(r.collegeId)?.name ?? r.collegeId,
    periodName: periodById.get(r.academicPeriodId)?.name ?? r.academicPeriodId,
    facultyName: r.facultyUserId
      ? facultyLabelByUserId.get(r.facultyUserId) ?? null
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
        subtitle="Accept or reject teaching-load justifications"
      />
      <div className="px-4 sm:px-6 lg:px-8 pb-10 max-w-5xl mx-auto">
        <DoiPolicyReviewsClient rows={vms} />
      </div>
    </div>
  );
}
