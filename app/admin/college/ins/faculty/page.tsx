import { redirect } from "next/navigation";

export default function CollegeInsFacultyRedirectPage() {
  redirect("/admin/college/ins?tab=faculty");
}
