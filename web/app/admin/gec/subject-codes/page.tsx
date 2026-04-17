import { ChairmanScopedPage } from "@/components/chairman/ChairmanScopedPage";
import { SubjectCodesWorkspace } from "@/components/subjects/SubjectCodesWorkspace";
import { BSIT_PROGRAM_CODE, BSIT_PROGRAM_ID } from "@/lib/chairman/bsit-prospectus";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

const GEC_ROUTING_COLLEGE_ID = "col-tech-eng";

/**
 * Subject codes — BSIT prospectus and database rows filtered to GEC-% / GEE-% only (general education).
 */
export default async function GecSubjectCodesPage() {
  const profile = await getAuthenticatedProfile();
  const collegeId = profile.collegeId ?? GEC_ROUTING_COLLEGE_ID;

  return (
    <ChairmanScopedPage
      title="Subject Codes (GEC / GEE)"
      subtitle="BSIT prospectus — GEC- and GEE-prefixed codes only. Major subjects stay with the Program Chairman."
      chairmanCollegeId={collegeId}
      chairmanProgramId={BSIT_PROGRAM_ID}
      chairmanProgramCode={BSIT_PROGRAM_CODE}
      chairmanProgramName="Bachelor of Science in Information Technology"
    >
      <SubjectCodesWorkspace
        lockedProgramId={BSIT_PROGRAM_ID}
        lockedProgramCode={BSIT_PROGRAM_CODE}
        gecCurriculumOnly
      />
    </ChairmanScopedPage>
  );
}
