import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { FacultyProfileWorkspace } from "@/components/faculty/FacultyProfileWorkspace";

export default function CollegeFacultyProfilePage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Faculty Profile"
        subtitle="Campus-wide directory — filter by college and department (program)."
      />
      <div className="px-8 pb-2">
        <CampusScopeFilters />
      </div>
      <FacultyProfileWorkspace />
    </div>
  );
}
