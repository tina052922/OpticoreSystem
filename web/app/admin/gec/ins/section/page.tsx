import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormSection } from "@/components/ins/INSFormSection";

export default function GecInsSectionPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle="Program by section (5B) — campus-wide. Vacant GEC slots are highlighted in the weekly grid."
      />
      <INSFormSection insBasePath="/admin/gec/ins" campusWide />
    </div>
  );
}
