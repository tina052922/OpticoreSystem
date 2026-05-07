import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAcademicPeriod } from "@/lib/server/dashboard-data";
import { TIME_SLOT_OPTIONS, FACULTY_POLICY_CONSTANTS } from "@/lib/scheduling/constants";
import { slotDurationHours } from "@/lib/scheduling/time";
import { formatTimeRange12h } from "@/lib/time/format-12h";

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

function overlapsSlot(entryStart: string, entryEnd: string, slotStart: string, slotEnd: string): boolean {
  const a0 = parseTimeToMinutes(entryStart);
  const a1 = parseTimeToMinutes(entryEnd);
  const b0 = parseTimeToMinutes(slotStart);
  const b1 = parseTimeToMinutes(slotEnd);
  return a0 < b1 && a1 > b0;
}

type Mode = "program" | "college" | "campus";

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const mode = (url.searchParams.get("mode")?.trim() as Mode | null) ?? "college";
  const collegeId = url.searchParams.get("collegeId")?.trim() || null;
  const programId = url.searchParams.get("programId")?.trim() || null;

  const period = await getCurrentAcademicPeriod();
  const academicPeriodId = period?.id ?? null;
  if (!academicPeriodId) {
    return NextResponse.json({
      roomUtilizationBySlot: [],
      facultyLoadDistribution: [],
    });
  }

  // Resolve sections in scope
  let sectionIds: string[] | null = null;

  if (mode === "program") {
    if (!programId) return NextResponse.json({ error: "programId is required for mode=program" }, { status: 400 });
    const { data: secs, error } = await supabase.from("Section").select("id").eq("programId", programId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    sectionIds = (secs ?? []).map((s: { id: string }) => s.id);
  } else if (mode === "college") {
    if (!collegeId) return NextResponse.json({ error: "collegeId is required for mode=college" }, { status: 400 });
    const { data: progs, error: pErr } = await supabase.from("Program").select("id").eq("collegeId", collegeId);
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
    const progIds = (progs ?? []).map((p: { id: string }) => p.id);
    if (progIds.length === 0) sectionIds = [];
    else {
      const { data: secs, error: sErr } = await supabase.from("Section").select("id").in("programId", progIds);
      if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });
      sectionIds = (secs ?? []).map((s: { id: string }) => s.id);
    }
  } else {
    sectionIds = null; // campus-wide
  }

  // Rooms in scope (for utilization denominator)
  let roomCount = 0;
  if (mode === "campus") {
    const { count } = await supabase.from("Room").select("id", { count: "exact", head: true });
    roomCount = count ?? 0;
  } else {
    // College/program dashboards still use room catalog scoped by collegeId (plus shared rooms where collegeId is null).
    const cid = mode === "program" ? collegeId : collegeId;
    if (!cid) {
      // If a caller didn't pass collegeId for program, fall back to all rooms.
      const { count } = await supabase.from("Room").select("id", { count: "exact", head: true });
      roomCount = count ?? 0;
    } else {
      const { count } = await supabase
        .from("Room")
        .select("id", { count: "exact", head: true })
        .or(`collegeId.eq.${cid},collegeId.is.null`);
      roomCount = count ?? 0;
    }
  }

  // Schedule rows in scope for the current academic period
  const base = supabase
    .from("ScheduleEntry")
    .select("instructorId,roomId,startTime,endTime,sectionId")
    .eq("academicPeriodId", academicPeriodId);

  const { data: entries, error: eErr } =
    sectionIds == null
      ? await base
      : sectionIds.length === 0
        ? { data: [], error: null }
        : await base.in("sectionId", sectionIds);

  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 400 });

  const rows = (entries ?? []) as Array<{
    instructorId: string;
    roomId: string;
    startTime: string;
    endTime: string;
    sectionId: string;
  }>;

  // Room utilization (per slot): % of rooms occupied by at least one class overlapping the slot
  const roomUtilizationBySlot = TIME_SLOT_OPTIONS.map((slot) => {
    const occupied = new Set<string>();
    for (const r of rows) {
      if (!r.roomId) continue;
      if (overlapsSlot(r.startTime, r.endTime, slot.startTime, slot.endTime)) occupied.add(r.roomId);
    }
    const pct = roomCount > 0 ? Math.round((occupied.size / roomCount) * 100) : 0;
    return { time: formatTimeRange12h(slot.startTime, slot.endTime), utilization: pct };
  });

  // Faculty load distribution: sum weekly contact hours by instructor for the term rows in scope
  const byInstructor = new Map<string, number>();
  for (const r of rows) {
    if (!r.instructorId) continue;
    const dur = slotDurationHours(r.startTime, r.endTime);
    byInstructor.set(r.instructorId, (byInstructor.get(r.instructorId) ?? 0) + dur);
  }

  let partial = 0;
  let full = 0;
  let over = 0;
  for (const hrs of byInstructor.values()) {
    if (hrs > FACULTY_POLICY_CONSTANTS.STANDARD_WEEKLY_TEACHING_HOURS + 1e-6) over += 1;
    else if (hrs >= 18 - 1e-6) full += 1;
    else partial += 1;
  }

  const facultyLoadDistribution = [
    { name: "Full Load", value: full, color: "#FF990A" },
    { name: "Partial Load", value: partial, color: "#FFC107" },
    { name: "Overloaded", value: over, color: "#F44336" },
  ];

  return NextResponse.json({
    roomUtilizationBySlot,
    facultyLoadDistribution,
  });
}

