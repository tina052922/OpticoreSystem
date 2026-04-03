import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { AuditLogViewer } from "@/components/audit/AuditLogViewer";

export default function CasAuditLogPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Audit log"
        subtitle="Campus-wide audit trail (RLS): access requests, inbox workflow, and related actions."
      />
      <div className="px-8 pb-10 max-w-6xl">
        <AuditLogViewer />
      </div>
    </div>
  );
}
