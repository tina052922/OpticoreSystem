import { ChairmanScopedPage } from "@/components/chairman/ChairmanScopedPage";
import { FacultyProfileWorkspace } from "@/components/faculty/FacultyProfileWorkspace";
import { BSIT_PROGRAM_CODE, BSIT_PROGRAM_ID } from "@/lib/chairman/bsit-prospectus";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

/** GEC routing college when `User.collegeId` is null (see `gec_routing_college_id()`). */
const GEC_ROUTING_COLLEGE_ID = "col-tech-eng";

/**
 * Faculty Profile — same CRUD as Program Chairman, scoped to instructors who teach GEC/GEE (or are not plotted yet).
 * Major-only faculty are omitted from the list; RLS allows inserts for the COTE college.
 */
export default async function GecFacultyProfilePage() {
  const profile = await getAuthenticatedProfile();
  const collegeId = profile.collegeId ?? GEC_ROUTING_COLLEGE_ID;

  return (
    <ChairmanScopedPage
      title="Faculty Profile (GEC)"
      subtitle="Enroll and update profiles for GEC staffing. The list shows GEC-relevant instructors; add rows to reserve Employee IDs before plotting vacant GEC slots."
      chairmanCollegeId={collegeId}
      chairmanProgramId={BSIT_PROGRAM_ID}
      chairmanProgramCode={BSIT_PROGRAM_CODE}
      chairmanProgramName="Bachelor of Science in Information Technology"
    >
      <FacultyProfileWorkspace
        chairmanCollegeId={collegeId}
        chairmanProgramCode={BSIT_PROGRAM_CODE}
        enableFacultyListEdit
        gecFacultyFilter
      />
    </ChairmanScopedPage>
  );
}
