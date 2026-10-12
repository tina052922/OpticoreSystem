import { CampusIntelligenceShell } from "@/components/campus-intelligence/CampusIntelligenceShell";
import { CHAIRMAN_NAV } from "@/lib/admin-nav";
import { getChairmanSession } from "@/lib/auth/chairman-session";

export const dynamic = "force-dynamic";

export default async function ChairmanLayout({ children }: { children: React.ReactNode }) {
  const session = await getChairmanSession();

  return (
    <CampusIntelligenceShell
      userName={session.name ?? undefined}
      profileImageUrl={session.profileImageUrl}
      userEmail={session.email}
      navItems={CHAIRMAN_NAV}
      /*
       * The department, not the college.
       *
       * A chairman chairs one program; the college is shared with every other chairman in it, so
       * "Chairman admin · COTE" did not say which chairman was signed in. The college code is kept
       * as the fallback for an account whose program is not recorded yet.
       */
      roleLabel={`Chairman admin${
        session.programCode ? ` · ${session.programCode}` : session.collegeCode ? ` · ${session.collegeCode}` : ""
      }`}
      profileHref="/chairman/profile"
      instructorRequestsBadge
    >
      {children}
    </CampusIntelligenceShell>
  );
}
