import { redirect } from "next/navigation";

export default function FacultyInsFacultyRedirectPage() {
  redirect("/faculty/ins?tab=faculty");
}
