/** Display names for seeded `College.id` values — extend when more colleges exist in DB. */
const COLLEGE_NAMES: Record<string, string> = {
  "col-tech-eng": "College of Technology and Engineering",
};

export function collegeDisplayName(collegeId: string | null): string {
  if (!collegeId) return "—";
  return COLLEGE_NAMES[collegeId] ?? collegeId;
}
