/** College + home department label for instructor registration lists. */
export function formatInstructorDepartmentLabel(args: {
  collegeCode?: string | null;
  collegeName?: string | null;
  programCode?: string | null;
  programName?: string | null;
}): string {
  const college = String(args.collegeCode ?? "").trim() || String(args.collegeName ?? "").trim();
  const code = String(args.programCode ?? "").trim();
  const name = String(args.programName ?? "").trim();
  const dept = code && name && code !== name ? `${code} — ${name}` : code || name;
  if (college && dept) return `${college} · ${dept}`;
  if (dept) return dept;
  if (college) return college;
  return "—";
}
