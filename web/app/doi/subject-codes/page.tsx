import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { SubjectCodesWithScope } from "@/components/subjects/SubjectCodesWithScope";

export default function DoiSubjectCodesPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Subject Codes"
        subtitle="Filter by college and department"
      />
      <SubjectCodesWithScope />
    </div>
  );
}
