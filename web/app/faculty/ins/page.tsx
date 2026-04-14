import Link from "next/link";
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

/**
 * Combined INS schedule page (Faculty / Section / Room) — mirrors College Admin structure,
 * scoped to sections the instructor teaches (`instructorPortalUserId` in `useInsCatalog`).
 */
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
        <ChairmanPageHeader title="INS Forms Schedule View" subtitle="College scope required for live schedule data." />
        <p className="px-4 sm:px-6 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg py-3 max-w-2xl mx-auto">
          Your account is not linked to a college. Contact the registrar or college admin to assign{" "}
          <code className="text-xs bg-white/80 px-1 rounded">collegeId</code> on your user profile.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ChairmanPageHeader
        title="INS Forms Schedule View"
        subtitle="Faculty, section, and room timetables for your assigned sections — uses the header academic period."
      />

      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <TabLink tab="faculty" activeTab={activeTab} href="/faculty/ins?tab=faculty" label="Faculty view" />
          <TabLink tab="section" activeTab={activeTab} href="/faculty/ins?tab=section" label="Section view" />
          <TabLink tab="room" activeTab={activeTab} href="/faculty/ins?tab=room" label="Room view" />
        </div>

        <div className="rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="p-3 sm:p-4">
            {activeTab === "faculty" ? (
              <INSFormFaculty
                insBasePath="/faculty/ins"
                viewerCollegeId={profile.collegeId}
                lockedInstructorId={profile.id}
                hideInnerInsTabs
              />
            ) : null}
            {activeTab === "section" ? (
              <INSFormSection
                insBasePath="/faculty/ins"
                viewerCollegeId={profile.collegeId}
                instructorPortalUserId={profile.id}
                hideInnerInsTabs
              />
            ) : null}
            {activeTab === "room" ? (
              <INSFormRoom
                insBasePath="/faculty/ins"
                viewerCollegeId={profile.collegeId}
                instructorPortalUserId={profile.id}
                hideInnerInsTabs
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
