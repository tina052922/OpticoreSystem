import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth/require-role";

/** Same schedule experience as other roles: combined INS Form with Faculty / Section / Room tabs. */
export default async function FacultySchedulePage() {
  await requireRoles(["instructor"]);
  redirect("/faculty/ins?tab=faculty");
}
