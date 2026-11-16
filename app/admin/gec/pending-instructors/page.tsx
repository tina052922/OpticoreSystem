import { ChairmanPageHeader } from "@/components/ChairmanPageHeader";
import { PendingInstructorsReview } from "@/components/faculty/PendingInstructorsReview";
import { requireRoles } from "@/lib/auth/require-role";
import { INSTRUCTOR_MANAGEMENT_NAV_LABEL } from "@/lib/admin-nav";

/**
 * GEC Chairman approval queue: GEC instructor registrations that name no department.
 *
 * Registrations that name a department — program, "both", or a GEC instructor drawn from a program —
 * go to that department's Program Chairman instead. The API decides which requests are shown here
 * (`reviewerMayHandleRequest`), from the session, not from anything this page passes.
 */
export default async function GecPendingInstructorsPage() {
  await requireRoles(["gec_chairman"]);
  return (
    <div>
      <ChairmanPageHeader
        title={INSTRUCTOR_MANAGEMENT_NAV_LABEL}
        subtitle="GEC instructors (with no home department) who verified their email and are waiting for your approval."
      />
      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        <PendingInstructorsReview />
      </div>
    </div>
  );
}
