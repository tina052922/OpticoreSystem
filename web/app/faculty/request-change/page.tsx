import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireRoles } from "@/lib/auth/require-role";

export default async function FacultyRequestChangePage() {
  const profile = await requireRoles(["instructor"]);
  const navItems = [
    { label: "Dashboard", href: "/faculty" },
    { label: "My schedule", href: "/faculty/schedule" },
    { label: "Request change", href: "/faculty/request-change" },
    { label: "Announcements", href: "/faculty/announcements" },
    { label: "Campus navigation", href: "/campus-navigation" },
  ];

  return (
    <PortalShell userName={profile.name} userEmail={profile.email} sidebarBadge="Faculty" navItems={navItems}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
        <Link href="/faculty" className="inline-flex items-center gap-2 text-sm font-medium text-black/70 hover:text-black">
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-black">Request schedule change</h1>
        <div className="rounded-xl border border-dashed border-black/20 bg-white p-6 text-sm text-black/65 leading-relaxed">
          This workflow will route requests to the Chairman Admin for review (per OptiCore use case). Form integration
          will be added here.
        </div>
      </div>
    </PortalShell>
  );
}
