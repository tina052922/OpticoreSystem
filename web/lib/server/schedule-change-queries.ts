import type { SupabaseClient } from "@supabase/supabase-js";
import { Q } from "@/lib/supabase/catalog-columns";
import type { Room, ScheduleEntry } from "@/types/db";

/** Section ids belonging to programs under this college. */
export async function getSectionIdsForCollege(
  supabase: SupabaseClient,
  collegeId: string,
): Promise<string[]> {
  const { data: programs } = await supabase.from("Program").select("id").eq("collegeId", collegeId);
  const programIds = (programs ?? []).map((p: { id: string }) => p.id);
  if (programIds.length === 0) return [];
  const { data: sections } = await supabase.from("Section").select("id").in("programId", programIds);
  return (sections ?? []).map((s: { id: string }) => s.id);
}

/** All schedule entries in a college for one term (for conflict scanning). */
export async function getScheduleEntriesForCollegePeriod(
  supabase: SupabaseClient,
  collegeId: string,
  academicPeriodId: string,
): Promise<ScheduleEntry[]> {
  const sectionIds = await getSectionIdsForCollege(supabase, collegeId);
  if (sectionIds.length === 0) return [];
  const { data, error } = await supabase
    .from("ScheduleEntry")
    .select(Q.scheduleEntry)
    .eq("academicPeriodId", academicPeriodId)
    .in("sectionId", sectionIds);
  if (error || !data) return [];
  return data as ScheduleEntry[];
}

export async function getRoomsForCollege(supabase: SupabaseClient, collegeId: string): Promise<Room[]> {
  const { data, error } = await supabase.from("Room").select(Q.room).eq("collegeId", collegeId).order("code");
  if (error || !data) return [];
  return data as Room[];
}
