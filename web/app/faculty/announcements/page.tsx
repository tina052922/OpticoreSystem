import Link from "next/link";
import { ArrowLeft, Megaphone } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireRoles } from "@/lib/auth/require-role";
import { getRecentNotifications } from "@/lib/server/dashboard-data";

export default async function FacultyAnnouncementsPage() {
  const profile = await requireRoles(["instructor"]);
  const notifications = await getRecentNotifications(profile.id, 50);

  const navItems = [
    { label: "Dashboard", href: "/faculty" },
    { label: "My schedule", href: "/faculty/schedule" },
    { label: "Request change", href: "/faculty/request-change" },
    { label: "Announcements", href: "/faculty/announcements" },
    { label: "Campus navigation", href: "/campus-navigation" },
  ];

  return (
    <PortalShell userName={profile.name} userEmail={profile.email} sidebarBadge="Faculty" navItems={navItems}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <Link href="/faculty" className="inline-flex items-center gap-2 text-sm font-medium text-black/70 hover:text-black">
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-black">Announcements</h1>
        <ul className="space-y-4">
          {notifications.length === 0 ? (
            <li className="rounded-xl border border-black/10 bg-white p-6 text-sm text-black/55 flex gap-3">
              <Megaphone className="w-5 h-5 text-[var(--color-opticore-orange)] shrink-0" />
              No announcements yet.
            </li>
          ) : (
            notifications.map((n) => (
              <li key={n.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                <p className="text-sm text-black/85 leading-relaxed">{n.message}</p>
                <p className="text-xs text-black/40 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
              </li>
            ))
          )}
        </ul>
      </div>
    </PortalShell>
  );
}
