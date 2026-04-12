import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormRoom } from "@/components/ins/INSFormRoom";

export default function GecInsRoomPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle="Room utilization (5C) — campus-wide. Vacant GEC slots are highlighted in the timetable."
      />
      <INSFormRoom insBasePath="/admin/gec/ins" campusWide />
    </div>
  );
}
