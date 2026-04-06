/**
 * GEC vacant-slot access requests are approved by College Admin (COTE) for CTU Argao demo data.
 * GEC Chairman users may have no college on their profile; routing still targets this college id.
 */
export const GEC_DEFAULT_APPROVAL_COLLEGE_ID =
  process.env.NEXT_PUBLIC_GEC_APPROVAL_COLLEGE_ID?.trim() || "col-tech-eng";
