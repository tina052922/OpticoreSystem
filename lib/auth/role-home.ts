// web/lib/auth/role-home.ts
import type { Role } from "@/lib/api/client";

export const getRoleHome = getDefaultHomeForRole;

export function getDefaultHomeForRole(
  role: Role | string | null | undefined,
): string {
  switch (role) {
    case "chairman_admin":
      return "/chairman/dashboard";
    case "college_admin":
      return "/admin/college";
    case "cas_admin":
      return "/admin/cas";
    case "gec_chairman":
      return "/admin/gec";
    case "doi_admin":
      return "/doi/dashboard";
    case "instructor":
      return "/faculty";
    case "student":
      return "/student";
    case "visitor":
      return "/campus-navigation";
    default:
      return "/login";
  }
}

export function pathAllowedForRole(
  role: Role | string | null | undefined,
  path: string,
): boolean {
  // Basic validation: ensure the path matches the role's general area
  if (!role) return false;

  const home = getDefaultHomeForRole(role);
  const homeBase = home.split("/")[1]; // e.g., "chairman", "admin", "faculty"

  return path.startsWith(`/${homeBase}`);
}
