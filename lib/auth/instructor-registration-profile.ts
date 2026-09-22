import { computeRatePerHour } from "@/lib/faculty/designation-system";
import { normalizeFacultyProfileStatus } from "@/lib/faculty/employment-status";
import { splitFullName } from "@/lib/faculty/hr-form-23b";

/** Profile fields accepted at instructor self-registration (matches Faculty Profile workspace). */
export type InstructorRegistrationProfileInput = {
  aka?: string | null;
  // HR Form 23B cells, matching the Faculty Profile page.
  lastName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  academicRank?: string | null;
  sex?: string | null;
  dateOfBirth?: string | null;
  educationalQualification?: string | null;
  experience?: string | null;
  eligibility?: string | null;
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

  // Registration collects the three name cells; older clients send only `fullName`, so fall back to
  // splitting it (the chairman can correct the split on the Faculty Profile page).
  const parts = splitFullName(fullName);

  return {
    userId,
    fullName: fullName.trim(),
    lastName: trimOrNull(input.lastName) ?? parts.lastName ?? null,
    firstName: trimOrNull(input.firstName) ?? parts.firstName ?? null,
    middleName: trimOrNull(input.middleName) ?? parts.middleName ?? null,
    academicRank: trimOrNull(input.academicRank),
    sex: trimOrNull(input.sex),
    dateOfBirth: trimOrNull(input.dateOfBirth),
    educationalQualification: trimOrNull(input.educationalQualification),
    experience: trimOrNull(input.experience),
    eligibility: trimOrNull(input.eligibility),
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
    ratePerHour: computeRatePerHour({
      bsDegree,
      msDegree,
      doctoralDegree,
      designation,
      educationalQualification: trimOrNull(input.educationalQualification),
    }),
  };
}
