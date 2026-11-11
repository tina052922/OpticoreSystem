import { redirect } from "next/navigation";

/**
 * Instructors use the same Change password page as every other role. This older faculty-only page
 * always demanded the current password, so an instructor on an admin-issued temporary password
 * could not set their own; old links land on the shared page instead.
 */
export default function FacultyChangePasswordPage() {
  redirect("/account/change-password?next=/faculty");
}
