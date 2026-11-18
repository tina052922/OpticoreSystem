import { redirect } from "next/navigation";

/** Chairman Assignment now lives in DOI → College Admins & Chairmen → Chairmen. */
export default function DoiChairAssignmentPage() {
  redirect("/doi/campus-accounts?tab=chairmen");
}
