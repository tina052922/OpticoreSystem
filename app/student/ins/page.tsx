import Link from "next/link";
import { Suspense } from "react";
import { INSFormRoom } from "@/components/ins/INSFormRoom";
import { INSFormSection } from "@/components/ins/INSFormSection";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { LOAD_GENERATOR_NAV_LABEL, STUDENT_PORTAL_NAV } from "@/lib/admin-nav";
import { requireRoles } from "@/lib/auth/require-role";

type TabKey = "section" | "room";

function TabLink({
  tab,
  activeTab,
  href,
  label,
}: {
  tab: TabKey;
  activeTab: TabKey;
  href: string;
  label: string;
}) {
  const active = tab === activeTab;
  return (
    <Button
      asChild
      variant={active ? "default" : "outline"}
      className={cn(
        "h-9 px-3 text-sm",
        active ? "bg-[#FF990A] hover:bg-[#FF990A]/90 text-white border-transparent" : "bg-white",
      )}
    >
      <Link href={href}>{label}</Link>
    </Button>
  );
}

/**
 * Students browse schedules by section and by room. Faculty personal (5A) views are not available here.
 * Own section timetable remains at `/student/schedule`.
 */
export default async function StudentInsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRoles(["student"]);
  const sp = (await searchParams) ?? {};
  const requestedTab = typeof sp.tab === "string" ? sp.tab : undefined;
  const activeTab: TabKey = requestedTab === "room" ? "room" : "section";
  const ownSectionId = profile.studentProfile?.sectionId?.trim() || null;
  const campusWide = !profile.collegeId;

  return (
    <PortalShell
      userName={profile.name ?? ""}
      profileImageUrl={profile.profileImageUrl}
      userEmail={profile.email}
      sidebarBadge="Student"
      navItems={STUDENT_PORTAL_NAV}
      periodLabel="Current semester"
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{LOAD_GENERATOR_NAV_LABEL}</h1>
          <p className="text-gray-600 text-sm mt-1">
            Browse class schedules by section or room. Your own section timetable stays under My schedule.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <TabLink tab="section" activeTab={activeTab} href="/student/ins?tab=section" label="Section view" />
          <TabLink tab="room" activeTab={activeTab} href="/student/ins?tab=room" label="Room view" />
        </div>

        <div className="rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="p-3 sm:p-4">
            <Suspense fallback={<div className="min-h-[240px] text-sm text-black/50 py-8 text-center">Loading…</div>}>
              {activeTab === "section" ? (
                <INSFormSection
                  insBasePath="/student/ins"
                  viewerCollegeId={profile.collegeId}
                  campusWide={campusWide}
                  hideInnerInsTabs
                  initialSectionId={ownSectionId}
                />
              ) : (
                <INSFormRoom
                  insBasePath="/student/ins"
                  viewerCollegeId={profile.collegeId}
                  campusWide={campusWide}
                  hideInnerInsTabs
                />
              )}
            </Suspense>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
