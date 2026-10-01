import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { FacultyProfileWithScope } from "@/components/faculty/FacultyProfileWithScope";
import { getAuthenticatedProfile } from "@/lib/auth/require-role";

/**
 * College a GEC enrollment is written to when the scope is campus-wide.
 *
 * `User.collegeId` is null for the GEC Chairman (migration 022) because the post belongs to the
 * campus, not a college — but a new faculty row still has to land in one. This is the college the
 * page already wrote to before it could search beyond it, so enrolling behaves exactly as it did.
 * See `gec_routing_college_id()`.
 */
const GEC_ROUTING_COLLEGE_ID = "col-tech-eng";

/**
 * Faculty Profile — GEC scope.
 *
 * The list is the GEC instructors, and general education is taught in every college, so the scope
 * bar opens on All colleges / All departments rather than being pinned to one. Narrowing it filters
 * the roster and the Advisory sections together.
 */
export default async function GecFacultyProfilePage() {
  await getAuthenticatedProfile();

  return (
    <div>
      <ChairmanPageHeader
        title="Faculty Profile (GEC)"
        subtitle="Enroll and update profiles for GEC staffing. Filter by college and department; the list shows GEC instructors across the campus."
      />
      <FacultyProfileWithScope
        gecFacultyFilter
        writeCollegeIdFallback={GEC_ROUTING_COLLEGE_ID}
        writeCollegeLabel="the College of Technology and Engineering"
      />
    </div>
  );
}
