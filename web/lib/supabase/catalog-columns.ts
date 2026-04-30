/**
 * Narrow PostgREST selects for catalog tables — less JSON over the wire and clearer intent.
 * Keep in sync with `@/types/db` (field names match DB columns).
 */
export const Q = {
  scheduleEntry:
    "id,academicPeriodId,subjectId,instructorId,sectionId,roomId,day,startTime,endTime,status,lockedByDoiAt",
  academicPeriod: "id,name,semester,academicYear,isCurrent,startDate,endDate",
  college: "id,code,name,campusDirectorUserId,contractSignerUserId",
  program: "id,code,name,collegeId",
  section: "id,programId,name,yearLevel,studentCount",
  subject: "id,code,subcode,title,lecUnits,lecHours,labUnits,labHours,programId,yearLevel",
  room: "id,code,building,floor,capacity,type,collegeId",
  /** INS catalog + hubs — signature URL for form signers (omit profileImageUrl: not used on INS and avoids DB errors if column not migrated). */
  userHub:
    "id,email,name,role,collegeId,employeeId,chairmanProgramId,signatureImageUrl",
  /** Includes employeeId — Evaluator plots by Employee ID (join key for instructor self-registration). */
  userChairmanScope: "id,email,name,role,collegeId,employeeId",
  campusInsSettings: "id,campusDirectorSignatureImageUrl,updatedAt",
  scheduleLoadJustification:
    "id,academicPeriodId,collegeId,authorUserId,authorName,authorEmail,justification,violationsSnapshot,createdAt,updatedAt,doiDecision,doiReviewedAt,doiReviewedById,doiReviewNote",
  /** Policy / evaluator loads (name + policy fields) */
  facultyProfilePolicy: "id,userId,fullName,status,designation,ratePerHour,advisorySectionId",
  /** INS 5A credentials block + form summary (+ `aka` for printed name rules) */
  facultyProfileIns:
    "id,userId,fullName,aka,advisorySectionId,bsDegree,msDegree,doctoralDegree,major1,major2,major3,minor1,minor2,minor3,specialTraining,designation,production,extension,research",
  /** Lightweight: INS catalog dropdowns / cell labels (AKA vs full name) */
  facultyProfileInsNames: "userId,fullName,aka",
  notification: "id,userId,message,isRead,createdAt",
  studentProfile: "id,userId,programId,sectionId,yearLevel,createdAt,updatedAt",
  accessRequest:
    "id,requesterId,collegeId,status,scopes,note,reviewedById,reviewedAt,expiresAt,createdAt,updatedAt",
  scheduleChangeRequest:
    "id,academicPeriodId,scheduleEntryId,instructorId,collegeId,requestedDay,requestedStartTime,requestedEndTime,reason,status,conflictSeverity,conflictDetails,adminSuggestion,reviewedById,reviewedAt,createdAt,updatedAt",
  doiScheduleFinalization:
    "id,academicPeriodId,status,signedByName,signedAt,signedAcknowledged,publishedAt,decidedById,decidedAt,notes,createdAt,updatedAt",
  /** Faculty profile workspace (full row for list + edit) */
  facultyProfileRow:
    "id,userId,fullName,aka,advisorySectionId,bsDegree,msDegree,doctoralDegree,major1,major2,major3,minor1,minor2,minor3,research,extension,production,specialTraining,status,designation,ratePerHour",
} as const;

export function defaultAcademicPeriodId(periods: readonly { id: string; isCurrent: boolean }[]): string {
  const cur = periods.find((p) => p.isCurrent) ?? periods[0];
  return cur?.id ?? "";
}
