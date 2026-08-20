import { redirect } from "next/navigation";

export default function DoiInsFacultyRedirectPage() {
  redirect("/doi/ins?tab=faculty");
}
