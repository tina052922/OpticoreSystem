import { redirect } from "next/navigation";

export default function CollegeInsRoomRedirectPage() {
  redirect("/admin/college/ins?tab=room");
}
