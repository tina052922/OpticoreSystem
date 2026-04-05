import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { SubjectCodesWithScope } from "@/components/subjects/SubjectCodesWithScope";

export default function DoiSubjectCodesPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Subject Codes"
        subtitle="Campus-wide subject repository — filter by college and department (program)."
      />
      <SubjectCodesWithScope />
    </div>
  );
}
