import { redirect } from "next/navigation";

/**
 * Announcements were removed from the Instructor portal.
 * Keep the route as a non-dead bookmark target by redirecting to the faculty home.
 */
export default function FacultyAnnouncementsRemovedPage() {
  redirect("/faculty");
}

