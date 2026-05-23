import { computeRatePerHour } from "@/lib/faculty/designation-system";
import { normalizeFacultyProfileStatus } from "@/lib/faculty/employment-status";

/** Profile fields accepted at instructor self-registration (matches Faculty Profile workspace). */
export type InstructorRegistrationProfileInput = {
  aka?: string | null;
  bsDegree?: string | null;
  msDegree?: string | null;
  doctoralDegree?: string | null;
  major1?: string | null;
  major2?: string | null;
  major3?: string | null;
  minor1?: string | null;
  minor2?: string | null;
  minor3?: string | null;
  research?: string | null;
  extension?: string | null;
  production?: string | null;
  specialTraining?: string | null;
  status?: string | null;
  designation?: string | null;
};

function trimOrNull(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

export function facultyProfileRowFromRegistration(
  userId: string,
  fullName: string,
  input: InstructorRegistrationProfileInput,
) {
  const bsDegree = trimOrNull(input.bsDegree);
  const msDegree = trimOrNull(input.msDegree);
  const doctoralDegree = trimOrNull(input.doctoralDegree);
  const status = normalizeFacultyProfileStatus(input.status);
  const designation = trimOrNull(input.designation);

  return {
    userId,
    fullName: fullName.trim(),
    aka: trimOrNull(input.aka),
    bsDegree,
    msDegree,
    doctoralDegree,
    major1: trimOrNull(input.major1),
    major2: trimOrNull(input.major2),
    major3: trimOrNull(input.major3),
    minor1: trimOrNull(input.minor1),
    minor2: trimOrNull(input.minor2),
    minor3: trimOrNull(input.minor3),
    research: trimOrNull(input.research),
    extension: trimOrNull(input.extension),
    production: trimOrNull(input.production),
    specialTraining: trimOrNull(input.specialTraining),
    status,
    designation,
    ratePerHour: computeRatePerHour({ bsDegree, msDegree, doctoralDegree }),
  };
}
