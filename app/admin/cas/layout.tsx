import { redirect } from "next/navigation";

/**
 * The CAS Admin now uses the College Admin pages (same interface); Subject Scheduler has a
 * "General subjects · all colleges" view for plotting into other colleges' vacant slots.
 */
export default function CasAdminLayout() {
  redirect("/admin/college");
}
