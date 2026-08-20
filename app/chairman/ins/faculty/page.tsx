import { redirect } from "next/navigation";

export default function ChairmanInsFacultyRedirectPage() {
  redirect("/chairman/ins?tab=faculty");
}
