import { CampusIntelligenceShell } from "@/components/campus-intelligence/CampusIntelligenceShell";
import { CHAIRMAN_NAV } from "@/lib/admin-nav";
import { getChairmanSession } from "@/lib/auth/chairman-session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ChairmanLayout({ children }: { children: React.ReactNode }) {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  return (
    <CampusIntelligenceShell
      userName={session.name}
      userEmail={session.email}
      navItems={CHAIRMAN_NAV}
      roleLabel="Chairman admin · CTE"
      profileHref="/chairman/profile"
    >
      {children}
    </CampusIntelligenceShell>
  );
}
