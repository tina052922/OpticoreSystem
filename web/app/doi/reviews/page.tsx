import { redirect } from "next/navigation";

/** Legacy URL: policy reviews live on the DOI Campus Intelligence dashboard (no separate sidebar item). */
export default function DoiReviewsRedirectPage() {
  redirect("/doi/dashboard");
}
