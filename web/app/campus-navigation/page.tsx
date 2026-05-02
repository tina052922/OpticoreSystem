import { redirect } from "next/navigation";

/**
 * Canonical Campus Navigation entrypoint.
 * Keep behavior identical to the original standalone Smart Campus Navigation app.
 */
export default function CampusNavigationPage() {
  redirect("/campus-navigation-standalone.html");
}
