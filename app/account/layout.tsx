import { CampusIntelligenceShell } from "@/components/campus-intelligence/CampusIntelligenceShell";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  CAS_ADMIN_NAV,
  CHAIRMAN_NAV,
  COLLEGE_ADMIN_NAV,
  DOI_ADMIN_NAV,
  GEC_CHAIRMAN_NAV,
  INSTRUCTOR_NAV,
  STUDENT_PORTAL_NAV,
} from "@/lib/admin-nav";
import { requireRoles } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

/**
 * Account pages (Change password) are shared by every role, so they live outside the role folders
 * — which left them with no sidebar or header at all. This wraps them in the signed-in user's own
 * shell, so Change password looks like the rest of their portal.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRoles([
    "instructor",
    "student",
    "chairman_admin",
    "college_admin",
    "cas_admin",
    "gec_chairman",
    "doi_admin",
  ]);

  if (profile.role === "student") {
    return (
      <PortalShell
        userName={profile.name ?? ""}
        profileImageUrl={profile.profileImageUrl}
        userEmail={profile.email}
        sidebarBadge="Student"
        navItems={STUDENT_PORTAL_NAV}
        profileHref="/student/profile"
      >
        {children}
      </PortalShell>
    );
  }

  const byRole = {
    instructor: { nav: INSTRUCTOR_NAV, label: "Instructor", profileHref: "/faculty/profile" },
    chairman_admin: { nav: CHAIRMAN_NAV, label: "Chairman admin", profileHref: "/chairman/profile" },
    college_admin: {
      nav: COLLEGE_ADMIN_NAV,
      label: profile.collegeCode ? `College admin · ${profile.collegeCode}` : "College admin",
      profileHref: "/admin/college/profile",
    },
    cas_admin: { nav: CAS_ADMIN_NAV, label: "CAS admin", profileHref: "/admin/cas/profile" },
    gec_chairman: { nav: GEC_CHAIRMAN_NAV, label: "GEC chairman", profileHref: "/admin/gec/profile" },
    doi_admin: { nav: DOI_ADMIN_NAV, label: "DOI · VPAA", profileHref: "/doi/profile" },
  } as const;
  const shell = byRole[profile.role as keyof typeof byRole] ?? byRole.instructor;

  return (
    <CampusIntelligenceShell
      userName={profile.name ?? undefined}
      profileImageUrl={profile.profileImageUrl}
      userEmail={profile.email}
      navItems={shell.nav}
      roleLabel={shell.label}
      profileHref={shell.profileHref}
    >
      {children}
    </CampusIntelligenceShell>
  );
}
