import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormRoom } from "@/components/ins/INSFormRoom";
import { LOAD_GENERATOR_NAV_LABEL } from "@/lib/admin-nav";

export default function CasInsRoomPage() {
  return (
    <div>
      <ChairmanPageHeader
        title={LOAD_GENERATOR_NAV_LABEL}
        subtitle="Schedule view"
      />
      <INSFormRoom insBasePath="/admin/cas/ins" />
    </div>
  );
}
