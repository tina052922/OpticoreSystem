import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConflictHit } from "@/lib/scheduling/types";
import { Q } from "@/lib/supabase/catalog-columns";
import type { Room, ScheduleEntry, Section, Subject, User } from "@/types/db";

export type EnrichedConflictHit = ConflictHit & {
  /** Human-readable conflicting row (day/time, subject, section, room, instructor). */
  detail: string;
};

/**
 * Turns raw conflict hits into admin-friendly lines (which faculty, section, room, slot).
 */
export async function enrichConflictHitsForDisplay(
  supabase: SupabaseClient,
  hits: ConflictHit[],
  entries: ScheduleEntry[],
): Promise<EnrichedConflictHit[]> {
  if (hits.length === 0) return [];

  const byId = new Map(entries.map((e) => [e.id, e]));
  const subIds = new Set<string>();
  const secIds = new Set<string>();
  const roomIds = new Set<string>();
  const userIds = new Set<string>();

  for (const h of hits) {
    const e = byId.get(h.withEntryId);
    if (!e) continue;
    subIds.add(e.subjectId);
    secIds.add(e.sectionId);
    roomIds.add(e.roomId);
    userIds.add(e.instructorId);
  }

  const [subs, secs, rms, users] = await Promise.all([
    subIds.size
      ? supabase.from("Subject").select(Q.subject).in("id", [...subIds])
      : Promise.resolve({ data: [] as Subject[] }),
    secIds.size
      ? supabase.from("Section").select(Q.section).in("id", [...secIds])
      : Promise.resolve({ data: [] as Section[] }),
    roomIds.size ? supabase.from("Room").select(Q.room).in("id", [...roomIds]) : Promise.resolve({ data: [] as Room[] }),
    userIds.size
      ? supabase.from("User").select("id,name").in("id", [...userIds])
      : Promise.resolve({ data: [] as Pick<User, "id" | "name">[] }),
  ]);

  const subMap = new Map((subs.data as Subject[] | null)?.map((s) => [s.id, s]) ?? []);
  const secMap = new Map((secs.data as Section[] | null)?.map((s) => [s.id, s]) ?? []);
  const roomMap = new Map((rms.data as Room[] | null)?.map((r) => [r.id, r]) ?? []);
  const userMap = new Map((users.data as Pick<User, "id" | "name">[] | null)?.map((u) => [u.id, u]) ?? []);

  return hits.map((h) => {
    const e = byId.get(h.withEntryId);
    if (!e) {
      return { ...h, detail: `Conflicting entry ${h.withEntryId.slice(0, 8)}…` };
    }
    const sub = subMap.get(e.subjectId);
    const sec = secMap.get(e.sectionId);
    const room = roomMap.get(e.roomId);
    const ins = userMap.get(e.instructorId);
    const detail = [
      `${e.day} ${e.startTime}–${e.endTime}`,
      sub?.code ? `Subject: ${sub.code}` : null,
      sec?.name ? `Section: ${sec.name}` : null,
      room?.code ? `Room: ${room.code}` : null,
      ins?.name ? `Instructor: ${ins.name}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return { ...h, detail };
  });
}
