import type { UserRole } from "@/types/db";

const LABELS: Partial<Record<UserRole, string>> = {
  chairman_admin: "Chairman Admin",
  college_admin: "College Admin",
  cas_admin: "CAS Admin",
  gec_chairman: "GEC Chairman",
  doi_admin: "DOI Admin",
  instructor: "Instructor",
  student: "Student",
  visitor: "Visitor",
};

export function adminRoleLabel(role: string): string {
  return LABELS[role as UserRole] ?? role.replace(/_/g, " ");
}
