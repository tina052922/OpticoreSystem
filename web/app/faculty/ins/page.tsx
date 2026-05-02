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

/** Combined INS schedule (Faculty / Section / Room) for the signed-in instructor. */
export default async function FacultyInsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireRoles(["instructor"]);
  const sp = (await searchParams) ?? {};
  const requestedTab = typeof sp.tab === "string" ? sp.tab : undefined;
  const activeTab: TabKey = requestedTab === "section" || requestedTab === "room" ? requestedTab : "faculty";

  if (!profile.collegeId) {
    return (
      <div>
        <ChairmanPageHeader title="INS Form" subtitle="A college must be linked to your account to load schedules." />
        <p className="px-4 sm:px-6 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg py-3 max-w-2xl mx-auto">
          Your account is not linked to a college. Ask your registrar or college admin to link your profile to a
          college so schedules can load.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ChairmanPageHeader title="INS Form" subtitle="Schedule view" />

      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <TabLink tab="faculty" activeTab={activeTab} href="/faculty/ins?tab=faculty" label="Faculty view" />
          <TabLink tab="section" activeTab={activeTab} href="/faculty/ins?tab=section" label="Section view" />
          <TabLink tab="room" activeTab={activeTab} href="/faculty/ins?tab=room" label="Room view" />
        </div>

        <div className="rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="p-3 sm:p-4">
            <Suspense fallback={<div className="min-h-[240px] text-sm text-black/50 py-8 text-center">Loading…</div>}>
              {activeTab === "faculty" ? (
                <INSFormFaculty
                  insBasePath="/faculty/ins"
                  viewerCollegeId={profile.collegeId}
                  lockedInstructorId={profile.id}
                  hideInnerInsTabs
                />
              ) : null}
              {activeTab === "section" ? (
                <INSFormSection insBasePath="/faculty/ins" viewerCollegeId={profile.collegeId} hideInnerInsTabs />
              ) : null}
              {activeTab === "room" ? (
                <INSFormRoom insBasePath="/faculty/ins" viewerCollegeId={profile.collegeId} hideInnerInsTabs />
              ) : null}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
