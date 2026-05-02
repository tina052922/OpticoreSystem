import { Suspense } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormFaculty } from "@/components/ins/INSFormFaculty";
import { requireRoles } from "@/lib/auth/require-role";

/**
 * My schedule = same official INS Form 5A (Faculty) as chairman/college: `ScheduleEntry` grid, print, and
 * clickable cells → Request schedule change (see `INSFormFaculty` instructor read-only mode).
 */
export default async function FacultySchedulePage() {
  const profile = await requireRoles(["instructor"]);

  if (!profile.collegeId) {
    return (
      <div>
        <ChairmanPageHeader title="My schedule" subtitle="INS Form — Faculty view" />
        <p className="px-4 sm:px-6 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg py-3 max-w-2xl mx-auto">
          Your account is not linked to a college. Ask your registrar or college admin to link your profile so
          schedules can load.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ChairmanPageHeader
        title="My schedule"
        subtitle="Official INS Form (Faculty). Click a class in the grid to request a change, or use Print / PDF."
      />

      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-3">
        <p className="text-xs text-black/55 max-w-3xl">
          Same layout as chairman and college admin. Use{" "}
          <a className="text-[#780301] font-medium underline" href="/faculty/ins?tab=section">
            INS Form
          </a>{" "}
          for section or room views, or <span className="font-medium text-black/70">Request schedule change</span> in
          the toolbar below.
        </p>
        <div className="rounded-xl border border-black/10 bg-white shadow-sm overflow-hidden">
          <Suspense
            fallback={<div className="min-h-[280px] text-sm text-black/50 py-12 text-center">Loading schedule…</div>}
          >
            <INSFormFaculty
              insBasePath="/faculty/ins"
              viewerCollegeId={profile.collegeId}
              lockedInstructorId={profile.id}
              hideInnerInsTabs
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
