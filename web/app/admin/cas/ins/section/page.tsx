import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormSection } from "@/components/ins/INSFormSection";
import { LOAD_GENERATOR_NAV_LABEL } from "@/lib/admin-nav";

export default function CasInsSectionPage() {
  return (
    <div>
      <ChairmanPageHeader
        title={LOAD_GENERATOR_NAV_LABEL}
        subtitle="Section schedule view — campus-wide; filter by college and department."
      />
      <INSFormSection insBasePath="/admin/cas/ins" />
    </div>
  );
}
