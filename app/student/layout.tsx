import { requireRoles } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

/** Role guard for all student routes. Pages keep their own portal chrome. */
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireRoles(["student"]);
  return <>{children}</>;
}
