import { redirect } from "next/navigation";

/**
 * The CAS Admin now uses the College Admin pages (same interface), plus "General Subjects (all
 * colleges)" for plotting general subjects into other colleges' vacant slots.
 */
export default function CasAdminLayout() {
  redirect("/admin/college");
}
