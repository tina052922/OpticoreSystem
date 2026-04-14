import { redirect } from "next/navigation";

/** Legacy URL — schedule change is initiated from My Schedule. */
export default function FacultyRequestChangeRedirectPage() {
  redirect("/faculty/schedule");
}
