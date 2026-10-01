import "server-only";
import { createClient } from "@supabase/supabase-js";
import { dominantProgramMode } from "@/lib/scheduling/dominant-program-mode";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/server/supabase-env";
import type { ProgramMode } from "@/lib/scheduling/program-mode";

/**
 * The programme a student is in — day or evening — read from their own section's schedule.
 *
 * Nothing on `Section` records this: a section is day or evening by virtue of the hours its classes
 * are plotted at, and every `ScheduleEntry` carries that. Resolving it here, on the server, means
 * the page renders already fixed to the right mode instead of flickering through the default.
 *
 * Returns null when the section has no schedule yet, or when the lookup fails. The caller leaves the
 * mode unlocked in that case rather than guessing a programme and showing an empty timetable.
 */
export async function getStudentProgramMode(
  sectionId: string | null | undefined,
): Promise<ProgramMode | null> {
  const id = (sectionId ?? "").trim();
  if (!id) return null;

  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;

  try {
    const admin = createClient(url, key);
    const { data, error } = await admin
      .from("ScheduleEntry")
      .select("programMode, programSession, day, startTime")
      .eq("sectionId", id);
    if (error || !data) return null;
    return dominantProgramMode(data);
  } catch {
    return null;
  }
}
