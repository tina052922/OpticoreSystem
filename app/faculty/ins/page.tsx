import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormRoom } from "@/components/ins/INSFormRoom";
import { INSFormSection } from "@/components/ins/INSFormSection";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { LOAD_GENERATOR_NAV_LABEL } from "@/lib/admin-nav";
import { requireRoles } from "@/lib/auth/require-role";

type TabKey = "section" | "room";

const TABS: { key: TabKey; label: string }[] = [
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
      <Link href={`/faculty/ins?tab=${tab.key}`}>{tab.label}</Link>
    </Button>
  );
}

/**
 * INS Forms Generator for instructors — Forms 5B (by section) and 5C (by room).
 *
 * There is no By faculty tab: the instructor's own Form 5A is My schedule (`/faculty/schedule`),
 * and old `?tab=faculty` links are sent there.
 *
 * Both views are limited to this instructor's own classes (`instructorOwnEntriesOnly`). The old
 * Load Generator browsed the whole college, so its section and room views listed every colleague
 * sharing a section or room; that stays closed.
 */
export default async function FacultyInsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRoles(["instructor"]);
  const sp = (await searchParams) ?? {};
  const requested = typeof sp.tab === "string" ? sp.tab : undefined;
  if (requested === "faculty") redirect("/faculty/schedule");
  const activeTab: TabKey = requested === "room" ? "room" : "section";

  if (!profile.collegeId) {
    return (
      <div>
        <ChairmanPageHeader title={LOAD_GENERATOR_NAV_LABEL} subtitle="INS Forms 5B and 5C" />
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
        title={LOAD_GENERATOR_NAV_LABEL}
        subtitle="Your classes as INS Forms — by section (5B) and by room (5C). Your own load (5A) is under My schedule."
      />

      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <TabLink key={tab.key} tab={tab} activeTab={activeTab} />
          ))}
        </div>

        <div className="rounded-xl border border-black/10 bg-white shadow-sm overflow-hidden">
          <Suspense
            fallback={<div className="min-h-[280px] text-sm text-black/50 py-12 text-center">Loading forms…</div>}
          >
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
