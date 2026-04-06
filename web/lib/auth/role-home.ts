/** Default landing path after sign-in for each OptiCore role. */
export function getDefaultHomeForRole(role: string): string {
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
      return "/faculty/schedule";
    case "student":
      return "/student";
    case "visitor":
      return "/campus-navigation";
    default:
      return "/login";
  }
}

/** Whether a role may open a path (prefix match). */
export function pathAllowedForRole(role: string, path: string): boolean {
  if (path.startsWith("/chairman")) return role === "chairman_admin";
  if (path.startsWith("/doi")) return role === "doi_admin";
  if (path.startsWith("/admin/college")) return role === "college_admin";
  if (path.startsWith("/admin/cas")) return role === "cas_admin";
  if (path.startsWith("/admin/gec")) return role === "gec_chairman";
  if (path.startsWith("/faculty")) return role === "instructor";
  if (path.startsWith("/student")) return role === "student";
  if (path.startsWith("/campus") || path.startsWith("/navigation")) {
    return [
      "student",
      "instructor",
      "chairman_admin",
      "college_admin",
      "cas_admin",
      "gec_chairman",
      "doi_admin",
      "visitor",
    ].includes(role);
  }
  return true;
}
