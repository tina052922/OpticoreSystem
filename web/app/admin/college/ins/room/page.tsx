import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormRoom } from "@/components/ins/INSFormRoom";

export default function CollegeInsRoomPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle="Room schedule view — campus-wide; filter by college and department."
      />
      <INSFormRoom insBasePath="/admin/college/ins" />
    </div>
  );
}
