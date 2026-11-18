import { redirect } from "next/navigation";

/** General Subjects moved into Subject Scheduler (CAS Admin: "General subjects · all colleges"). */
export default function CasGeneralSubjectsPage() {
  redirect("/admin/college/evaluator/general");
}
