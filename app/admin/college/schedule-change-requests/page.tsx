import { redirect } from "next/navigation";

/** Schedule change requests were removed. */
export default function CollegeScheduleChangeRequestsRedirect() {
  redirect("/admin/college/evaluator");
}
