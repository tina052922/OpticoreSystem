import { redirect } from "next/navigation";

/**
 * Announcements were removed from the Student portal.
 * Keep the route as a non-dead bookmark target by redirecting to the dashboard.
 */
export default function StudentAnnouncementsRemovedPage() {
  redirect("/student");
}

