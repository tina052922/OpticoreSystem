import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormFaculty } from "@/components/ins/INSFormFaculty";
import { INSFormRoom } from "@/components/ins/INSFormRoom";
import { INSFormSection } from "@/components/ins/INSFormSection";
import { Button } from "@/components/ui/button";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";
import { cn } from "@/components/ui/utils";
import Link from "next/link";

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

export default async function GecInsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getAuthenticatedProfile();
  const campusWide = !profile.collegeId;
  const sp = (await searchParams) ?? {};
  const requestedTab = typeof sp.tab === "string" ? sp.tab : undefined;
  const activeTab: TabKey = requestedTab === "section" || requestedTab === "room" ? requestedTab : "faculty";

  return (
    <div>
      <ChairmanPageHeader
        title="INS Forms Schedule View"
        subtitle="One combined INS schedule page with Faculty, Section, and Room views (matches College Admin structure)."
      />

      <div className="px-6 pb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <TabLink tab="faculty" activeTab={activeTab} href="/admin/gec/ins?tab=faculty" label="Faculty view" />
          <TabLink tab="section" activeTab={activeTab} href="/admin/gec/ins?tab=section" label="Section view" />
          <TabLink tab="room" activeTab={activeTab} href="/admin/gec/ins?tab=room" label="Room view" />
        </div>

        <div className="rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="p-4">
            {activeTab === "faculty" ? (
              <INSFormFaculty insBasePath="/admin/gec/ins" viewerCollegeId={profile.collegeId} campusWide={campusWide} />
            ) : null}
            {activeTab === "section" ? (
              <INSFormSection insBasePath="/admin/gec/ins" viewerCollegeId={profile.collegeId} campusWide={campusWide} />
            ) : null}
            {activeTab === "room" ? (
              <INSFormRoom insBasePath="/admin/gec/ins" viewerCollegeId={profile.collegeId} campusWide={campusWide} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
