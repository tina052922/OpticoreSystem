import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormFaculty } from "@/components/ins/INSFormFaculty";

/** GEC Chairman: campus-wide INS 5A; vacant GEC/GEE placeholder rows are highlighted in the grid. */
export default function GecInsFacultyPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle="Schedule view — all colleges. Vacant GEC slots (orange outline) use the placeholder instructor until filled in the Central Hub Evaluator."
      />
      <INSFormFaculty insBasePath="/admin/gec/ins" campusWide />
    </div>
  );
}
