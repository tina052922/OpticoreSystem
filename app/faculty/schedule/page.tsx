import Link from "next/link";
import { Suspense } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormFaculty } from "@/components/ins/INSFormFaculty";
import { INSFormRoom } from "@/components/ins/INSFormRoom";
import { INSFormSection } from "@/components/ins/INSFormSection";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { requireRoles } from "@/lib/auth/require-role";

type TabKey = "faculty" | "section" | "room";

const TABS: { key: TabKey; label: string }[] = [
  { key: "faculty", label: "My load" },
  { key: "section", label: "By section" },
  { key: "room", label: "By room" },
];

function TabLink({ tab, activeTab }: { tab: { key: TabKey; label: string }; activeTab: TabKey }) {
  const active = tab.key === activeTab;
  return (
    <Button
      asChild
      variant={active ? "default" : "outline"}
      className={cn(
        "h-9 px-3 text-sm",
        active ? "bg-[#FF990A] hover:bg-[#FF990A]/90 text-white border-transparent" : "bg-white",
      )}
    >
      <Link href={`/faculty/schedule?tab=${tab.key}`}>{tab.label}</Link>
    </Button>
  );
}

/**
 * My schedule — official INS Form 5A (Faculty), plus the section and room views that used to sit
 * behind a separate Load Generator page.
 *
 * Every view is limited to this instructor's own classes. The old page let a faculty member browse
 * the whole college: the section view showed every colleague teaching a section they happened to
 * share, and the room view showed whoever else used the room. `instructorOwnEntriesOnly` is what
 * makes these three views three ways of reading the same personal timetable rather than three ways
 * into everyone's.
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
  const activeTab: TabKey = requested === "section" || requested === "room" ? requested : "faculty";

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
      <ChairmanPageHeader title="My schedule" subtitle="Your teaching load, by form, section and room" />

      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <TabLink key={tab.key} tab={tab} activeTab={activeTab} />
          ))}
        </div>

        <div className="rounded-xl border border-black/10 bg-white shadow-sm overflow-hidden">
          <Suspense
            fallback={<div className="min-h-[280px] text-sm text-black/50 py-12 text-center">Loading schedule…</div>}
          >
            {activeTab === "faculty" ? (
              <INSFormFaculty
                insBasePath="/faculty/ins"
                viewerCollegeId={profile.collegeId}
                lockedInstructorId={profile.id}
                hideInstructorSearch
                hideInnerInsTabs
              />
            ) : null}
            {activeTab === "section" ? (
              <INSFormSection
                insBasePath="/faculty/ins"
                viewerCollegeId={profile.collegeId}
                instructorPortalUserId={profile.id}
                instructorOwnEntriesOnly
                hideInnerInsTabs
              />
            ) : null}
            {activeTab === "room" ? (
              <INSFormRoom
                insBasePath="/faculty/ins"
                viewerCollegeId={profile.collegeId}
                instructorPortalUserId={profile.id}
                instructorOwnEntriesOnly
                hideInnerInsTabs
              />
            ) : null}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
