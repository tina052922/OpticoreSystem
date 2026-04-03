import Link from "next/link";
import { CalendarPlus, Inbox, MapPin, Shield } from "lucide-react";
import { CiDashboard } from "@/components/campus-intelligence/CiDashboard";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function GecChairmanDashboardPage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div className="space-y-8 pb-8">
      <CiDashboard welcomeName={profile.name} basePath="/admin/gec" variant="gec" />

      <div className="px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardCard title="GEC rules">
            <ul className="space-y-2 text-sm text-black/75 list-disc pl-5">
              <li>Receive distribution notice in <strong>Inbox → Mail</strong>.</li>
              <li>
                Use <strong>Vacant GEC slots</strong> to assign instructor / room / time into empty cells only.
              </li>
              <li>Optionally request temporary edit access from CAS / College (notification).</li>
            </ul>
          </DashboardCard>
          <DashboardCard title="Shortcuts">
            <div className="space-y-3">
              <Link
                href="/admin/gec/vacant-slots"
                className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/50"
              >
                <CalendarPlus className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Vacant GEC slots
              </Link>
              <Link
                href="/admin/gec/inbox"
                className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/50"
              >
                <Inbox className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Inbox
              </Link>
              <Link
                href="/campus-navigation"
                className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-3 text-sm font-medium hover:border-[var(--color-opticore-orange)]/50"
              >
                <MapPin className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Campus navigation
              </Link>
              <div className="flex items-center gap-2 text-xs text-black/50 pt-2">
                <Shield className="w-3.5 h-3.5" />
                Centralized plotting; GEC edits are scoped to vacant cells.
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
