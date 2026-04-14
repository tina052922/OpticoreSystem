import { redirect } from "next/navigation";

export default function FacultyInsRoomRedirectPage() {
  redirect("/faculty/ins?tab=room");
}
