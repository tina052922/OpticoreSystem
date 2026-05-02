import Link from "next/link";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormFaculty } from "@/components/ins/INSFormFaculty";
import { INSFormRoom } from "@/components/ins/INSFormRoom";
import { INSFormSection } from "@/components/ins/INSFormSection";
import { DoiInsFormalApprovalPanel } from "@/components/doi/DoiInsFormalApprovalPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";

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

export default async function DoiInsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const requestedTab = typeof sp.tab === "string" ? sp.tab : undefined;
  const activeTab: TabKey = requestedTab === "section" || requestedTab === "room" ? requestedTab : "faculty";

  return (
    <div>
      <ChairmanPageHeader title="INS Form" subtitle="Schedule view — campus-wide" />

      <div className="px-4 sm:px-6 lg:px-8 pb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <TabLink tab="faculty" activeTab={activeTab} href="/doi/ins?tab=faculty" label="Faculty view" />
          <TabLink tab="section" activeTab={activeTab} href="/doi/ins?tab=section" label="Section view" />
          <TabLink tab="room" activeTab={activeTab} href="/doi/ins?tab=room" label="Room view" />
        </div>

        <div className="rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="p-3 sm:p-4">
            {activeTab === "faculty" ? (
              <INSFormFaculty
                insBasePath="/doi/ins"
                campusWide
                hideInnerInsTabs
                doiApprovalSlot={(ctx) => (
                  <DoiInsFormalApprovalPanel
                    periodId={ctx.periodId}
                    periods={ctx.periods}
                    onPeriodIdChange={ctx.onPeriodIdChange}
                    reloadCatalog={ctx.reloadCatalog}
                  />
                )}
              />
            ) : null}
            {activeTab === "section" ? <INSFormSection insBasePath="/doi/ins" campusWide hideInnerInsTabs /> : null}
            {activeTab === "room" ? <INSFormRoom insBasePath="/doi/ins" campusWide hideInnerInsTabs /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
