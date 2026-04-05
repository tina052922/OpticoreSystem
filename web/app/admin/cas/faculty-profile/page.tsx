import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { FacultyProfileWithScope } from "@/components/faculty/FacultyProfileWithScope";

export default function CasFacultyProfilePage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Faculty Profile"
        subtitle="Campus-wide directory — filter by college and department (program)."
      />
      <FacultyProfileWithScope />
    </div>
  );
}
