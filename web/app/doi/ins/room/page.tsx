import { redirect } from "next/navigation";

export default function DoiInsRoomRedirectPage() {
  redirect("/doi/ins?tab=room");
}
