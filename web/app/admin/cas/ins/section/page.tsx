import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormSection } from "@/components/ins/INSFormSection";

export default function CasInsSectionPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle="Section schedule view — campus-wide; filter by college and department."
      />
      <INSFormSection insBasePath="/admin/cas/ins" />
    </div>
  );
}
