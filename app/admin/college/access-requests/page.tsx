import { redirect } from "next/navigation";

/** College Admin Access Request review was removed; keep URL from bookmarking a dead page. */
export default function CollegeAccessRequestsRemovedPage() {
  redirect("/admin/college");
}
