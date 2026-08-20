import { Button } from "@/components/ui/button";

export type AdminProfileCardProps = {
  fullName: string;
  /** Shown as Employee ID; falls back to internal user id when missing. */
  employeeId?: string | null;
  roleLabel: string;
  /** College / department line */
  collegeLine: string;
  email: string;
  accountStatus?: string;
  /** Extra grid rows (e.g. program scope for chairman). */
  extraRows?: Array<{ label: string; value: string }>;
  /** Optional second line under the name (e.g. role • college) */
  subheading?: string;
};

/**
 * Shared profile card — matches Chairman profile layout for all admin roles.
 */
export function AdminProfileCard({
  fullName,
  employeeId,
  roleLabel,
  collegeLine,
  email,
  accountStatus = "Active",
  extraRows = [],
  subheading,
}: AdminProfileCardProps) {
  const idLine = employeeId?.trim() || "—";

  const baseRows: Array<[string, string]> = [
    ["Employee ID", idLine],
    ["Role", roleLabel],
    ["College / Department", collegeLine],
    ["Email", email],
    ["Account Status", accountStatus],
  ];

  const extraGrid = extraRows.map((r) => [r.label, r.value] as [string, string]);
  const allRows = [...baseRows, ...extraGrid];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 max-w-[900px]">
      <div className="text-[22px] font-semibold text-gray-900">{fullName}</div>
      {subheading ? (
        <div className="text-[13px] text-gray-600 mt-1">{subheading}</div>
      ) : (
        <div className="text-[13px] text-gray-600 mt-1">
          {roleLabel} • {collegeLine}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 text-[14px]">
        {allRows.map(([k, v]) => (
          <div key={k} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
            <div className="text-[12px] text-gray-500">{k}</div>
            <div className="font-semibold mt-1 text-gray-900 break-words">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <Button className="bg-[#FF990A] hover:bg-[#e88909] text-white" type="button" disabled>
          Edit Profile
        </Button>
        <Button variant="outline" className="bg-white" type="button" disabled>
          Change Password
        </Button>
      </div>

      <p className="text-[12px] text-gray-500 mt-6">
        Profile data is loaded from your account. Employee ID may mirror your internal user record when no separate
        employee number is stored.
      </p>
    </div>
  );
}
