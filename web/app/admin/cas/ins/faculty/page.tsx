import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormFaculty } from "@/components/ins/INSFormFaculty";
import { LOAD_GENERATOR_NAV_LABEL } from "@/lib/admin-nav";

export default function CasInsFacultyPage() {
  return (
    <div>
      <ChairmanPageHeader
        title={LOAD_GENERATOR_NAV_LABEL}
        subtitle="Schedule view"
      />
      <INSFormFaculty insBasePath="/admin/cas/ins" />
    </div>
  );
}
