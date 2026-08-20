import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { apiFetch } from "@/lib/api/client";

export type CampusIntelligenceStats = {
  roomCount: number;
  sectionCount: number;
  facultyCount: number;
  draftScheduleCount: number;
};

export type RoomUtilizationSlot = { time: string; utilization: number };
export type FacultyLoadBand = { name: string; value: number; color: string };

export type CampusIntelligenceData = CampusIntelligenceStats & {
  roomUtilizationBySlot: RoomUtilizationSlot[];
  facultyLoadDistribution: FacultyLoadBand[];
};

/**
 * Build a Supabase admin client for direct fallback queries.
 * Uses server-side env vars — NEVER exposed to the browser.
 */
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function buildQs(args: {
  mode: "chairman_program" | "program" | "college" | "gec_campus" | "doi_campus";
  collegeId?: string | null;
  programId?: string | null;
}): string {
    const backendMode =
      args.mode === "chairman_program" ? "program" :
      args.mode === "doi_campus" || args.mode === "gec_campus" ? "campus" :
      args.mode;
  const p = new URLSearchParams();
  p.set("mode", backendMode);
  if (args.collegeId) p.set("collegeId", args.collegeId);
  if (args.programId) p.set("programId", args.programId);
  p.set("_t", Date.now().toString());
  return p.toString();
}

export async function getCampusIntelligenceStats(
  args: {
    mode:
      | "chairman_program"
      | "program"
      | "college"
      | "gec_campus"
      | "doi_campus";
    collegeId?: string | null;
    programId?: string | null;
  },
): Promise<CampusIntelligenceData> {
  const qs = buildQs(args);

  // Prefer: fetch from Express backend
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const data = await apiFetch<CampusIntelligenceData>(
      `/api/analytics/dashboard?${qs}`,
      {
        method: "GET",
        cookieHeader,
        cache: "no-store",
      },
    );

    console.log("[Analytics] Fetched from Express:", data);
    return data;
  } catch (expressErr) {
    console.warn(
      "[Analytics] Express fetch failed:",
      expressErr instanceof Error ? expressErr.message : expressErr,
    );
  }

  // Fallback: query Supabase directly (for local dev without Express running)
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      console.log("[Analytics] Falling back to direct Supabase query");
      return await fetchAnalyticsDirectly(supabase, args);
    } catch (directErr) {
      console.error("[Analytics] Direct Supabase query also failed:", directErr);
    }
  }

  // Last resort: empty data
  return {
    roomCount: 0,
    sectionCount: 0,
    facultyCount: 0,
    draftScheduleCount: 0,
    roomUtilizationBySlot: [],
    facultyLoadDistribution: [],
  };
}

/**
 * Direct Supabase query fallback — mirrors the Express analytics controller logic.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAnalyticsDirectly(supabase: any, args: {
    mode: "chairman_program" | "program" | "college" | "gec_campus" | "doi_campus";
    collegeId?: string | null;
    programId?: string | null;
  },
): Promise<CampusIntelligenceData> {
  const rawMode = args.mode === "chairman_program" ? "program" : args.mode;
  const isCampus = rawMode === "gec_campus" || rawMode === "doi_campus";
  const mode = isCampus ? "campus" : rawMode;
  const collegeId = args.collegeId ?? undefined;
  const programId = args.programId ?? undefined;

  // Resolve current academic period (fall back to latest)
  let { data: period } = await supabase
    .from("AcademicPeriod")
    .select("id")
    .eq("isCurrent", true)
    .maybeSingle();
  if (!period) {
    const { data: latest } = await supabase
      .from("AcademicPeriod")
      .select("id")
      .order("startDate", { ascending: false })
      .limit(1)
      .maybeSingle();
    period = latest;
  }

  let roomCount = 0;
  let sectionCount = 0;
  let facultyCount = 0;
  let draftScheduleCount = 0;
  let sectionIds: string[] = [];

  if (mode === "program" && collegeId && programId) {
    const { count: rc } = await supabase
      .from("Room")
      .select("id", { count: "exact", head: true })
      .or(`collegeId.eq.${collegeId},collegeId.is.null`);
    roomCount = rc ?? 0;

    const { data: secs, count: sc } = await supabase
      .from("Section")
      .select("id", { count: "exact" })
      .eq("programId", programId);
    sectionCount = sc ?? 0;
    sectionIds = (secs || []).map((s: any) => s.id);

    const { count: fc } = await supabase
      .from("User")
      .select("id", { count: "exact", head: true })
      .eq("collegeId", collegeId)
      .eq("role", "instructor");
    facultyCount = fc ?? 0;

    if (sectionIds.length > 0 && period) {
      const { count: dc } = await supabase
        .from("ScheduleEntry")
        .select("id", { count: "exact", head: true })
        .eq("academicPeriodId", period.id)
        .eq("status", "draft")
        .in("sectionId", sectionIds);
      draftScheduleCount = dc ?? 0;
    }
  } else if (mode === "college" && collegeId) {
    const { count: rc } = await supabase
      .from("Room")
      .select("id", { count: "exact", head: true })
      .eq("collegeId", collegeId);
    roomCount = rc ?? 0;

    const { data: programs } = await supabase
      .from("Program")
      .select("id")
      .eq("collegeId", collegeId);
    const pIds = (programs || []).map((p: any) => p.id);
    if (pIds.length > 0) {
      const { data: secs, count: sc } = await supabase
        .from("Section")
        .select("id", { count: "exact" })
        .in("programId", pIds);
      sectionCount = sc ?? 0;
      sectionIds = (secs || []).map((s: any) => s.id);

      const { count: fc } = await supabase
        .from("User")
        .select("id", { count: "exact", head: true })
        .eq("collegeId", collegeId)
        .eq("role", "instructor");
      facultyCount = fc ?? 0;
      if (period && sectionIds.length > 0) {
        const { count: dc } = await supabase
          .from("ScheduleEntry")
          .select("id", { count: "exact", head: true })
          .eq("academicPeriodId", period.id)
          .eq("status", "draft")
          .in("sectionId", sectionIds);
        draftScheduleCount = dc ?? 0;
      }
    }
  } else if (mode === "campus") {
    const { count: rc } = await supabase
      .from("Room")
      .select("id", { count: "exact", head: true });
    roomCount = rc ?? 0;
    const { data: secs, count: sc } = await supabase
      .from("Section")
      .select("id", { count: "exact" });
    sectionCount = sc ?? 0;
    sectionIds = (secs || []).map((s: any) => s.id);
    const { count: fc } = await supabase
      .from("User")
      .select("id", { count: "exact", head: true })
      .eq("role", "instructor");
    facultyCount = fc ?? 0;
    if (period && sectionIds.length > 0) {
      const { count: dc } = await supabase
        .from("ScheduleEntry")
        .select("id", { count: "exact", head: true })
        .eq("academicPeriodId", period.id)
        .eq("status", "draft")
        .in("sectionId", sectionIds);
      draftScheduleCount = dc ?? 0;
    }
  }

  // ── Time block helpers ──
  const blockLabels = [
    "7:00 AM – 9:00 AM",   "9:00 AM – 11:00 AM",
    "11:00 AM – 1:00 PM",  "1:00 PM – 3:00 PM",
    "3:00 PM – 5:00 PM",   "5:00 PM – 7:00 PM",
  ];
  const BLOCK_COUNT = 6;
  function timeBlockIdx(st: string): number {
    const h = parseInt(st.split(":")[0], 10);
    const i = Math.floor((h - 7) / 2);
    return i >= 0 && i < BLOCK_COUNT ? i : -1;
  }

  // Combined schedule entry query (room + workload in one pass)
  let roomUtilizationBySlot: RoomUtilizationSlot[] = [];
  let facultyLoadDistribution: FacultyLoadBand[] = [];

  if (sectionIds.length > 0 && period) {
    const { data: entries } = await supabase
      .from("ScheduleEntry")
      .select("day, startTime, endTime, roomId, instructorId")
      .eq("academicPeriodId", period.id)
      .in("sectionId", sectionIds);

    if (entries && entries.length > 0) {
      const blockRooms: Set<string>[] = Array.from({ length: BLOCK_COUNT }, () => new Set());
      const instructorHours = new Map<string, number>();

      for (const e of entries) {
        const idx = timeBlockIdx(e.startTime);
        if (idx >= 0 && e.roomId) blockRooms[idx].add(e.roomId);
        if (e.instructorId && e.startTime && e.endTime) {
          const [sh] = e.startTime.split(":").map(Number);
          const [eh] = e.endTime.split(":").map(Number);
          const hrs = Math.abs(eh - sh);
          instructorHours.set(e.instructorId, (instructorHours.get(e.instructorId) || 0) + hrs);
        }
      }

      const totalRooms = roomCount || 1;
      roomUtilizationBySlot = blockRooms.map((rooms, idx) => ({
        time: blockLabels[idx],
        utilization: Math.round((rooms.size / totalRooms) * 100),
      }));

      let full = 0, partial = 0, overloaded = 0;
      for (const hrs of instructorHours.values()) {
        if (hrs >= 24) overloaded++;
        else if (hrs >= 18) full++;
        else partial++;
      }
      facultyLoadDistribution = [
        { name: "Full Load", value: full, color: "#FF990A" },
        { name: "Partial Load", value: partial, color: "#FFC107" },
        { name: "Overloaded", value: overloaded, color: "#F44336" },
      ];
    }
  }

  return {
    roomCount,
    sectionCount,
    facultyCount,
    draftScheduleCount,
    roomUtilizationBySlot,
    facultyLoadDistribution,
  };
}

export async function getCampusIntelligenceCharts(
  args: {
    mode:
      | "chairman_program"
      | "program"
      | "college"
      | "gec_campus"
      | "doi_campus";
    collegeId?: string | null;
    programId?: string | null;
  },
): Promise<{
  roomUtilizationBySlot: RoomUtilizationSlot[];
  facultyLoadDistribution: FacultyLoadBand[];
}> {
  const data = await getCampusIntelligenceStats(args);
  return {
    roomUtilizationBySlot: data.roomUtilizationBySlot,
    facultyLoadDistribution: data.facultyLoadDistribution,
  };
}
