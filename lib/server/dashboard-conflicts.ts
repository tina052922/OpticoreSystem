import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api/client";

export type DashboardConflictBanner = {
  conflictingRowCount: number;
  previewLines: string[];
  evaluatorHref: string;
};

export async function getDashboardConflictBanner(args: {
  mode: "chairman_program" | "college" | "gec_campus" | "doi_campus";
  collegeId?: string | null;
  programId?: string | null;
  periodId?: string | null;
}): Promise<DashboardConflictBanner | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    // 1. Get current academic period from Express backend
    const periodRes = await apiFetch<{ semester: { id: string } | null }>(
      `/api/semesters/current?_t=${Date.now()}`,
      {
        method: "GET",
        cookieHeader,
        cache: "no-store",
        next: { revalidate: 0 },
      },
    );

    const academicPeriodId = args.periodId || periodRes.semester?.id;
    if (!academicPeriodId) {
      console.log("[Conflicts] No current academic period found");
      return null;
    }

    // 2. Scan for conflicts via Express backend
    const scanRes = await apiFetch<{
      entryCount: number;
      conflictingEntryIds: string[];
      issueSummaries: string[];
      issues: {
        entryId: string;
        type: string;
        message: string;
        relatedEntryId?: string;
      }[];
      enrichedIssues: any[];
    }>("/api/scheduling/scope-conflict-scan", {
      method: "POST",
      cookieHeader,
      cache: "no-store",
      next: { revalidate: 0 },
      body: {
        academicPeriodId,
        mode: args.mode,
        collegeId: args.collegeId ?? undefined,
        programId: args.programId ?? undefined,
      },
    });

    const conflictingCount = scanRes.conflictingEntryIds.length;
    if (conflictingCount === 0) {
      console.log("[Conflicts] No conflicts found");
      return null;
    }

    const previewLines = scanRes.issueSummaries.slice(0, 3);

    let evaluatorHref = "/chairman/evaluator";
    if (args.mode === "college") evaluatorHref = "/admin/college/evaluator";
    if (args.mode === "gec_campus") evaluatorHref = "/admin/gec/evaluator";
    if (args.mode === "doi_campus") evaluatorHref = "/doi/evaluator";

    return {
      conflictingRowCount: conflictingCount,
      previewLines,
      evaluatorHref,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard conflicts:", error);
    return null;
  }
}
