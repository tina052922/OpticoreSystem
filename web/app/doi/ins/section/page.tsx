import { redirect } from "next/navigation";

export default function DoiInsSectionRedirectPage() {
  redirect("/doi/ins?tab=section");
}
