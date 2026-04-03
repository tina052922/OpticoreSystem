import { redirect } from "next/navigation";

/** Legacy URL; canonical campus navigation placeholder is `/campus-navigation`. */
export default function CampusPageRedirect() {
  redirect("/campus-navigation");
}
