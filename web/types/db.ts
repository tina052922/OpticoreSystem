export type UserRole =
  | "chairman_admin"
  | "college_admin"
  | "cas_admin"
  | "gec_chairman"
  | "doi_admin"
  | "instructor"
  | "student"
  | "visitor";

export type ScheduleStatus = "draft" | "final" | "conflicted";

export interface AcademicPeriod {
  id: string;
  name: string;
  semester: string;
  academicYear: string;
  isCurrent: boolean;
  startDate: string | null; // date
  endDate: string | null; // date
}

export interface College {
  id: string;
  code: string;
  name: string;
  /** Optional INS signer (Campus Director line). */
  campusDirectorUserId?: string | null;
  /** Optional INS signer (Contract line). */
  contractSignerUserId?: string | null;
}

/** Singleton (id = default): campus-wide INS settings — not per college. */
export interface CampusInsSettings {
  id: string;
  campusDirectorSignatureImageUrl?: string | null;
  updatedAt: string;
}

export interface Program {
  id: string;
  code: string;
  name: string;
  collegeId: string;
}

export interface Section {
  id: string;
  programId: string;
  name: string;
  yearLevel: number;
  studentCount: number;
}

export interface User {
  id: string;
  employeeId: string | null;
  email: string;
  name: string;
  role: UserRole;
  collegeId: string | null;
  /** Set for chairman_admin: the one program they manage. */
  chairmanProgramId?: string | null;
  /** Public URL for INS / formal forms (uploaded in Profile). */
  signatureImageUrl?: string | null;
  /** Public URL for header / profile avatar. */
  profileImageUrl?: string | null;
  createdAt: string; // timestamptz
  updatedAt: string; // timestamptz
}

export interface FacultyProfile {
  id: string;
  userId: string;
  fullName: string;
  aka: string | null;
  bsDegree: string | null;
  msDegree: string | null;
  doctoralDegree: string | null;
  major1: string | null;
  major2: string | null;
  major3: string | null;
  minor1: string | null;
  minor2: string | null;
  minor3: string | null;
  research: string | null;
  extension: string | null;
  production: string | null;
  specialTraining: string | null;
  status: string | null;
  designation: string | null;
  ratePerHour: number | null;
}

export interface Subject {
  id: string;
  code: string;
  subcode: string | null;
  title: string;
  lecUnits: number;
  lecHours: number;
  labUnits: number;
  labHours: number;
  programId: string;
  yearLevel: number;
}

export interface Room {
  id: string;
  code: string;
  building: string | null;
  floor: number | null;
  capacity: number | null;
  type: string | null;
  collegeId: string | null;
}

export interface ScheduleEntry {
  id: string;
  academicPeriodId: string;
  subjectId: string;
  instructorId: string;
  sectionId: string;
  roomId: string;
  day: string;
  startTime: string;
  endTime: string;
  status: ScheduleStatus;
  /** Set when VPAA publishes the term; plotted rows cannot be edited by chairman/college (RLS). */
  lockedByDoiAt?: string | null;
}

/** Chairman documents why plotted loads exceed Faculty Manual caps; visible to DOI. */
export interface ScheduleLoadJustification {
  id: string;
  academicPeriodId: string;
  collegeId: string;
  authorUserId: string;
  authorName: string;
  authorEmail: string | null;
  justification: string;
  violationsSnapshot: unknown | null;
  createdAt: string;
  updatedAt: string;
  /** VPAA/DOI: null = not reviewed yet. */
  doiDecision?: "accepted" | "rejected" | "pending" | null;
  doiReviewedAt?: string | null;
  doiReviewedById?: string | null;
  doiReviewNote?: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  isRead: boolean;
  createdAt: string; // timestamptz
}

export interface StudentProfile {
  id: string;
  userId: string;
  programId: string;
  sectionId: string;
  yearLevel: number;
  createdAt: string;
  updatedAt: string;
}

/** Request Access: College Admin approves temporary scoped access for GEC/CAS. */
export type AccessScope = "evaluator" | "ins_forms" | "gec_vacant_slots";

export type AccessRequestStatus = "pending" | "approved" | "rejected";

export interface AccessRequestRow {
  id: string;
  requesterId: string;
  collegeId: string;
  status: AccessRequestStatus;
  scopes: AccessScope[];
  note: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleChangeStatus = "pending" | "approved" | "rejected" | "approved_with_solution";

export interface ScheduleChangeRequest {
  id: string;
  academicPeriodId: string;
  scheduleEntryId: string;
  instructorId: string;
  collegeId: string;
  requestedDay: string;
  requestedStartTime: string;
  requestedEndTime: string;
  reason: string;
  status: ScheduleChangeStatus;
  conflictSeverity: "none" | "small" | "large" | null;
  conflictDetails: unknown | null;
  adminSuggestion: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** VPAA / DOI campus-wide approval of master schedules per term. */
export interface DoiScheduleFinalization {
  id: string;
  academicPeriodId: string;
  status: "pending" | "approved" | "rejected";
  signedByName: string | null;
  signedAt: string | null;
  signedAcknowledged: boolean;
  /** Set when approved: publication / go-live timestamp for the term master schedule. */
  publishedAt: string | null;
  decidedById: string | null;
  decidedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRow {
  id: string;
  actorId: string;
  collegeId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

