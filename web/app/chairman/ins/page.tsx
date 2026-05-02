import Link from "next/link";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormFaculty } from "@/components/ins/INSFormFaculty";
import { INSFormRoom } from "@/components/ins/INSFormRoom";
import { INSFormSection } from "@/components/ins/INSFormSection";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { getChairmanSession } from "@/lib/auth/chairman-session";
import { redirect } from "next/navigation";

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

export default async function ChairmanInsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  const sp = (await searchParams) ?? {};
  const requestedTab = typeof sp.tab === "string" ? sp.tab : undefined;
  const activeTab: TabKey = requestedTab === "section" || requestedTab === "room" ? requestedTab : "faculty";

  return (
    <div>
      <ChairmanPageHeader title="INS Form" subtitle="Schedule view" />

      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <TabLink tab="faculty" activeTab={activeTab} href="/chairman/ins?tab=faculty" label="Faculty view" />
          <TabLink tab="section" activeTab={activeTab} href="/chairman/ins?tab=section" label="Section view" />
          <TabLink tab="room" activeTab={activeTab} href="/chairman/ins?tab=room" label="Room view" />
        </div>

        <div className="rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="p-3 sm:p-4">
            {activeTab === "faculty" ? (
              <INSFormFaculty
                insBasePath="/chairman/ins"
                chairmanCollegeId={session.collegeId}
                chairmanProgramId={session.programId}
                chairmanProgramCode={session.programCode}
                chairmanProgramName={session.programName}
                hideInnerInsTabs
              />
            ) : null}
            {activeTab === "section" ? (
              <INSFormSection
                insBasePath="/chairman/ins"
                chairmanCollegeId={session.collegeId}
                chairmanProgramId={session.programId}
                chairmanProgramCode={session.programCode}
                chairmanProgramName={session.programName}
                hideInnerInsTabs
              />
            ) : null}
            {activeTab === "room" ? (
              <INSFormRoom
                insBasePath="/chairman/ins"
                chairmanCollegeId={session.collegeId}
                chairmanProgramId={session.programId}
                chairmanProgramCode={session.programCode}
                chairmanProgramName={session.programName}
                hideInnerInsTabs
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
