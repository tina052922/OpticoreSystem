import { redirect } from "next/navigation";

/** DOI uses centralized `ScheduleEntry` + Policy reviews; legacy inbox URL redirects to the dashboard. */
export default function DoiInboxRedirectPage() {
  redirect("/doi/dashboard");
}
