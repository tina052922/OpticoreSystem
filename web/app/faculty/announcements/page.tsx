import Link from "next/link";
import { Megaphone } from "lucide-react";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { requireRoles } from "@/lib/auth/require-role";
import { getRecentNotifications } from "@/lib/server/dashboard-data";

export default async function FacultyAnnouncementsPage() {
  const profile = await requireRoles(["instructor"]);
  const notifications = await getRecentNotifications(profile.id, 50);

  return (
    <div>
      <ChairmanPageHeader title="Announcements" subtitle="In-app messages including schedule change decisions." />
      <div className="px-4 sm:px-6 lg:px-8 pb-10 max-w-3xl mx-auto space-y-6">
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
        <Link href="/faculty" className="text-sm font-medium text-[#780301] hover:underline">
          ← Back to Campus Intelligence
        </Link>
      </div>
    </div>
  );
}
