import { redirect } from "next/navigation";

/** Chairperson Assignment now lives in DOI → College Admins & Chairpersons → Chairpersons. */
export default function DoiChairAssignmentPage() {
  redirect("/doi/campus-accounts?tab=chairmen");
}
