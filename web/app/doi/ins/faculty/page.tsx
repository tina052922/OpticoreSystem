import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { INSFormFaculty } from "@/components/ins/INSFormFaculty";

export default function DoiInsFacultyPage() {
  return (
    <div>
      <ChairmanPageHeader
        title="INS Form"
        subtitle="Schedule view — campus-wide scope; narrow by college and department using the search bar above."
      />
      <INSFormFaculty insBasePath="/doi/ins" />
    </div>
  );
}
