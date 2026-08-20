import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function NotFound() {
  const cookieStore = await cookies();
  const lastPath = cookieStore.get("last_visited_path")?.value;
  if (lastPath && lastPath.startsWith("/") && lastPath !== "/login") {
    redirect(lastPath);
  }
  redirect("/");
}
