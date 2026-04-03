import Link from "next/link";
import { GitBranch, Inbox, MapPin, Send } from "lucide-react";
import { CiDashboard } from "@/components/campus-intelligence/CiDashboard";
import { DashboardCard } from "@/components/portal/DashboardCard";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

export default async function CasAdminDashboardPage() {
  const profile = await getAuthenticatedProfile();

  return (
    <div className="space-y-8 pb-8">
      <CiDashboard welcomeName={profile.name} basePath="/admin/cas" variant="full" />

      <div className="px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <DashboardCard title="CAS workflow">
              <ul className="space-y-3 text-sm text-black/75">
                <li className="flex gap-2">
                  <GitBranch className="w-4 h-4 mt-0.5 text-[var(--color-opticore-orange)] shrink-0" />
                  <span>
                    <strong>Inbox → Mail:</strong> drafts from College Admin.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Send className="w-4 h-4 mt-0.5 text-[var(--color-opticore-orange)] shrink-0" />
                  <span>
                    <strong>GEC distribution:</strong> send only GEC-related rows to the assigned GEC Chairman.
                  </span>
                </li>
                <li className="flex gap-2">
                  <GitBranch className="w-4 h-4 mt-0.5 text-[var(--color-opticore-orange)] shrink-0" />
                  <span>
                    When GEC returns filled vacant slots, validate and forward the complete draft to DOI (see Inbox).
                  </span>
                </li>
              </ul>
            </DashboardCard>
          </div>
          <DashboardCard title="Shortcuts">
            <div className="space-y-3">
              <Link
                href="/admin/cas/inbox"
                className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-3 text-sm font-medium hover:bg-black/[0.02]"
              >
                <Inbox className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Inbox
              </Link>
              <Link
                href="/admin/cas/distribution"
                className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-3 text-sm font-medium hover:bg-black/[0.02]"
              >
                <Send className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                GEC distribution
              </Link>
              <Link
                href="/campus-navigation"
                className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-3 text-sm font-medium hover:bg-black/[0.02]"
              >
                <MapPin className="w-4 h-4 text-[var(--color-opticore-orange)]" />
                Campus navigation
              </Link>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
