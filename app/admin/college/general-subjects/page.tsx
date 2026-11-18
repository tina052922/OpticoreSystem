import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth/require-role";
import { CasGeneralSubjectsClient } from "./CasGeneralSubjectsClient";

/**
 * CAS College Admin: plot general subjects into other colleges' vacant slots — the Service Chair
 * scheduler, for every general subject. What other colleges plotted stays read-only (server-enforced).
 */
export default async function CasGeneralSubjectsPage() {
  const profile = await requireRoles(["college_admin"]);
  if (!profile.casAdmin) redirect("/admin/college/evaluator");
  return <CasGeneralSubjectsClient />;
}
