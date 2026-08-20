import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { FacultyProfileWithScope } from "@/components/faculty/FacultyProfileWithScope";

export default function DoiFacultyProfilePage() {
  return (
    <div>
      <ChairmanPageHeader
        title="Faculty Profile"
        subtitle="Filter by college and department"
      />
      <FacultyProfileWithScope />
    </div>
  );
}
