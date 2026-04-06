import { redirect } from "next/navigation";

/** Legacy URL: campus-wide scheduling and VPAA tools live on the INS Form. */
export default function DoiScheduleHubPage() {
  redirect("/doi/ins/faculty");
}
