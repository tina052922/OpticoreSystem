import { redirect } from "next/navigation";

export default function ChairmanInsSectionRedirectPage() {
  redirect("/chairman/ins?tab=section");
}
