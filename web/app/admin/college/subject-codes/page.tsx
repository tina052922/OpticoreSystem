import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { CampusScopeFilters } from "@/components/campus/CampusScopeFilters";
import { SubjectCodesWorkspace } from "@/components/subjects/SubjectCodesWorkspace";

export default function CollegeSubjectCodesPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Subject Codes"
        subtitle="Campus-wide subject repository — filter by college and department (program)."
      />
      <div className="px-8 pb-2">
        <CampusScopeFilters />
      </div>
      <SubjectCodesWorkspace />
    </div>
  );
}
