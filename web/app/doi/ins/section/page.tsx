import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormSection } from "@/components/ins/INSFormSection";

export default function DoiInsSectionPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle="Section schedule view — campus-wide; filter by college and department."
      />
      <INSFormSection insBasePath="/doi/ins" />
    </div>
  );
}
