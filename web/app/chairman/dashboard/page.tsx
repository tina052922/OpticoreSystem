import { redirect } from "next/navigation";
import { CiDashboard } from "@/components/campus-intelligence/CiDashboard";
import { getChairmanSession } from "@/lib/auth/chairman-session";

export default async function ChairmanDashboardPage() {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  return <CiDashboard welcomeName={session.name} basePath="/chairman" variant="full" />;
}
