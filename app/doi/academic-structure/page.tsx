import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { AcademicStructureWorkspace } from "@/components/admin/AcademicStructureWorkspace";

export default function DoiAcademicStructurePage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Academic Structure"
        subtitle="College → Program → Years → Section"
      />
      <AcademicStructureWorkspace canManageColleges />
    </div>
  );
}
