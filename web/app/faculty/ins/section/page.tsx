import { redirect } from "next/navigation";

export default function FacultyInsSectionRedirectPage() {
  redirect("/faculty/ins?tab=section");
}
