import { redirect } from "next/navigation";

/**
 * The student INS Forms Generator was removed. A student's schedule is their own section's
 * Form 5B, which lives (with Preview PDF) under My schedule; old links land there.
 */
export default function StudentInsIndexPage() {
  redirect("/student/schedule");
}
