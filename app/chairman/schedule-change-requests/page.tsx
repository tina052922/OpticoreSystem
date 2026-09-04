import { redirect } from "next/navigation";

/** Schedule change requests were removed. */
export default function ChairmanScheduleChangeRequestsRedirect() {
  redirect("/chairman/evaluator");
}
