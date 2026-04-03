import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { AuditLogViewer } from "@/components/audit/AuditLogViewer";

export default function CollegeAuditLogPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Audit log"
        subtitle="Timestamped record of access requests, inbox shares, forwards, and other workflow actions for your college."
      />
      <div className="px-8 pb-10 max-w-6xl">
        <AuditLogViewer />
      </div>
    </div>
  );
}
