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
  if (!role || !path.startsWith("/")) return false;
  if (path.startsWith("/campus-navigation") || path.startsWith("/account/")) return true;

  switch (role) {
    case "college_admin":
      return path.startsWith("/admin/college");
    case "cas_admin":
      return path.startsWith("/admin/cas");
    case "gec_chairman":
      return path.startsWith("/admin/gec");
    case "chairman_admin":
      return path.startsWith("/chairman");
    case "doi_admin":
      return path.startsWith("/doi");
    case "instructor":
      return path.startsWith("/faculty");
    case "student":
      return path.startsWith("/student");
    case "visitor":
      return path.startsWith("/campus-navigation");
    default:
      return false;
  }
}
