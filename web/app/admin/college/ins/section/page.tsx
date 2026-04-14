import { redirect } from "next/navigation";

export default function CollegeInsSectionRedirectPage() {
  redirect("/admin/college/ins?tab=section");
}
