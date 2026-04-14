import Link from "next/link";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { requireRoles } from "@/lib/auth/require-role";

/** Account summary + quick link to password (shell provides global nav). */
export default async function FacultyProfilePage() {
  const profile = await requireRoles(["instructor"]);

  return (
    <div>
      <ChairmanPageHeader title="Profile" subtitle="Your OptiCore instructor account." />
      <div className="px-4 sm:px-6 lg:px-8 pb-10 max-w-lg space-y-4">
        <dl className="rounded-xl border border-black/10 bg-white p-5 text-sm space-y-3 shadow-sm">
          <div>
            <dt className="text-black/50 font-medium">Name</dt>
            <dd className="font-semibold text-black">{profile.name}</dd>
          </div>
          <div>
            <dt className="text-black/50 font-medium">Email</dt>
            <dd className="text-black/85 break-all">{profile.email}</dd>
          </div>
        </dl>
        <Link
          href="/faculty/change-password"
          className="inline-flex text-sm font-semibold text-[#780301] hover:underline"
        >
          Change password
        </Link>
      </div>
    </div>
  );
}
