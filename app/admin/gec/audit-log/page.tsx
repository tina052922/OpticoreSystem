import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { AuditLogViewer } from "@/components/audit/AuditLogViewer";

/** Your own actions only (the server returns just this account's entries). */
export default function ServiceChairAuditLogPage() {
  return (
    <div>
      <ChairmanPageHeader title="Audit log" subtitle="A timestamped record of the changes you made." />
      <div className="px-8 pb-10 max-w-6xl">
        <AuditLogViewer auditUnreadScope="gec" />
      </div>
    </div>
  );
}
