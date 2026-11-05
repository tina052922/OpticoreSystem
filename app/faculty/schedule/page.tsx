import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormFaculty } from "@/components/ins/INSFormFaculty";
import { requireRoles } from "@/lib/auth/require-role";

/**
 * My schedule — only this instructor's own teaching load (INS Form 5A).
 *
 * The section and room views moved to the INS Forms Generator (`/faculty/ins`). Old
 * `?tab=section` / `?tab=room` links are sent there so bookmarks keep working.
 *
 * `insBasePath` stays `/faculty/ins` on purpose — it is the identifier the INS components use to
 * decide this is a read-only faculty portal, not a link target.
 */
export default async function FacultySchedulePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRoles(["instructor"]);
  const sp = (await searchParams) ?? {};
  const requested = typeof sp.tab === "string" ? sp.tab : undefined;
  if (requested === "section" || requested === "room") redirect(`/faculty/ins?tab=${requested}`);

  if (!profile.collegeId) {
    return (
      <div>
        <ChairmanPageHeader title="My schedule" subtitle="Your teaching load" />
        <p className="px-4 sm:px-6 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg py-3 max-w-2xl mx-auto">
          Your account is not linked to a college. Ask your registrar or college admin to link your profile so
          schedules can load.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ChairmanPageHeader title="My schedule" subtitle="Your teaching load (INS Form 5A)" />

      <div className="px-4 sm:px-6 lg:px-8 pb-6">
        <div className="rounded-xl border border-black/10 bg-white shadow-sm overflow-hidden">
          <Suspense
            fallback={<div className="min-h-[280px] text-sm text-black/50 py-12 text-center">Loading schedule…</div>}
          >
            <INSFormFaculty
              insBasePath="/faculty/ins"
              viewerCollegeId={profile.collegeId}
              lockedInstructorId={profile.id}
              hideInstructorSearch
              hideInnerInsTabs
              hideGroupingStrip
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
