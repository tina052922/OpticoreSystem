import type { AccessRequestWithName } from "@/hooks/use-access-requests";

/** Approved evaluator access to another college's hub (AccessRequest.collegeId = resource college). */
export function hasApprovedCrossCollegeEvaluatorAccess(
  requests: AccessRequestWithName[] | undefined,
  targetCollegeId: string,
  requesterId: string,
): boolean {
  if (!requests?.length) return false;
  const now = Date.now();
  return requests.some(
    (r) =>
      r.requesterId.toLowerCase() === requesterId.toLowerCase() &&
      r.collegeId === targetCollegeId &&
      r.status === "approved" &&
      Array.isArray(r.scopes) &&
      r.scopes.includes("evaluator") &&
      (!r.expiresAt || new Date(r.expiresAt).getTime() > now),
  );
}

export function pendingCrossCollegeEvaluatorRequest(
  requests: AccessRequestWithName[] | undefined,
  targetCollegeId: string,
  requesterId: string,
): AccessRequestWithName | undefined {
  return requests?.find(
    (r) =>
      r.requesterId.toLowerCase() === requesterId.toLowerCase() &&
      r.collegeId === targetCollegeId &&
      r.status === "pending" &&
      Array.isArray(r.scopes) &&
      r.scopes.includes("evaluator"),
  );
}
