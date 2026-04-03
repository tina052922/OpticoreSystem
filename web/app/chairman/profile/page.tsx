import { redirect } from "next/navigation";
import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { AdminProfileCard } from "@/components/admin/AdminProfileCard";
import { getChairmanSession } from "@/lib/auth/chairman-session";
import { collegeDisplayName } from "@/lib/college-labels";
import { adminRoleLabel } from "@/lib/role-labels";

export default async function ChairmanProfilePage() {
  const session = await getChairmanSession();
  if (!session) redirect("/login");

  const extraRows: Array<{ label: string; value: string }> = [];
  if (session.programCode || session.programName) {
    extraRows.push({
      label: "Program scope",
      value: [session.programCode, session.programName].filter(Boolean).join(" — ") || "—",
    });
  }

  return (
    <div>
      <ChairmanPageHeader title="Profile" subtitle="Account overview — same layout for all OptiCore admin roles." />

      <div className="px-6 pb-8">
        <AdminProfileCard
          fullName={session.name}
          employeeId={session.authId.slice(0, 8).toUpperCase()}
          roleLabel={adminRoleLabel(session.role)}
          collegeLine={collegeDisplayName(session.collegeId)}
          email={session.email}
          extraRows={extraRows}
          subheading={`${adminRoleLabel(session.role)} • ${collegeDisplayName(session.collegeId)}`}
        />
      </div>
    </div>
  );
}
