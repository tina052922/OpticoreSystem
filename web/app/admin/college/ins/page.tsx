import Link from "next/link";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormFaculty } from "@/components/ins/INSFormFaculty";
import { INSFormRoom } from "@/components/ins/INSFormRoom";
import { INSFormSection } from "@/components/ins/INSFormSection";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

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
 * Combined INS page (Faculty / Section / Room) — same tab pattern as Program Chairman routes,
 * scoped to the college admin’s college (`viewerCollegeId`).
 */
export default async function CollegeInsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getAuthenticatedProfile();
  const sp = (await searchParams) ?? {};
  const requestedTab = typeof sp.tab === "string" ? sp.tab : undefined;
  const activeTab: TabKey = requestedTab === "section" || requestedTab === "room" ? requestedTab : "faculty";

  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle="Schedule view — Faculty, Section, and Room (same layout as Program Chairman INS forms; college-scoped review)."
      />

      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <TabLink tab="faculty" activeTab={activeTab} href="/admin/college/ins?tab=faculty" label="Faculty view" />
          <TabLink tab="section" activeTab={activeTab} href="/admin/college/ins?tab=section" label="Section view" />
          <TabLink tab="room" activeTab={activeTab} href="/admin/college/ins?tab=room" label="Room view" />
        </div>

        <div className="rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="p-3 sm:p-4">
            {activeTab === "faculty" ? (
              <INSFormFaculty insBasePath="/admin/college/ins" viewerCollegeId={profile.collegeId} hideInnerInsTabs />
            ) : null}
            {activeTab === "section" ? (
              <INSFormSection insBasePath="/admin/college/ins" viewerCollegeId={profile.collegeId} hideInnerInsTabs />
            ) : null}
            {activeTab === "room" ? (
              <INSFormRoom insBasePath="/admin/college/ins" viewerCollegeId={profile.collegeId} hideInnerInsTabs />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
