import { redirect } from "next/navigation";

/** Legacy URL — opens My schedule (INS Form) with the request modal once. */
export default function FacultyRequestChangeRedirectPage() {
  redirect("/faculty/schedule?requestChange=1");
}
