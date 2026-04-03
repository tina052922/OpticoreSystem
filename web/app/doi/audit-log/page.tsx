import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { AuditLogViewer } from "@/components/audit/AuditLogViewer";

export default function DoiAuditLogPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Audit log"
        subtitle="Campus-wide audit trail (RLS): schedules workflow, access requests, and inbox actions."
      />
      <div className="px-8 pb-10 max-w-6xl">
        <AuditLogViewer />
      </div>
    </div>
  );
}
