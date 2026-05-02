import { redirect } from "next/navigation";

export default function ChairmanInsRoomRedirectPage() {
  redirect("/chairman/ins?tab=room");
}
