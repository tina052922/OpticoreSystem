/**
 * Rule-based genetic algorithm for schedule alternatives.
 * — Population: candidate assignments (day, slot, room, instructor).
 * — Fitness: hard constraints (no overlap) as feasibility gate; soft constraints via
 *   faculty weekly load penalty + light preference for balanced loads.
 */

import { DEFAULT_MAX_FACULTY_HOURS_PER_WEEK, TIME_SLOT_OPTIONS, WEEKDAYS } from "./constants";
import { detectConflictsForEntry } from "./conflicts";
import type { GASuggestion, ScheduleBlock } from "./types";

function slotDurationHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map((x) => parseInt(x, 10));
  const [eh, em] = end.split(":").map((x) => parseInt(x, 10));
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

function facultyWeeklyHours(instructorId: string, blocks: ScheduleBlock[]): number {
  return blocks
    .filter((b) => b.instructorId === instructorId)
    .reduce((sum, b) => sum + slotDurationHours(b.startTime, b.endTime), 0);
}

export type GAParams = {
  /** All committed + draft entries except the one being replaced (if any). */
  universe: ScheduleBlock[];
  /** Section for the class being plotted (fixed). */
  sectionId: string;
  /** Subject id (for labeling only). */
  subjectId: string;
  /** Academic period id. */
  academicPeriodId: string;
  /** Omit this entry id from conflict checks (editing an existing draft). */
  excludeEntryId?: string;
  /** Candidate pools */
  roomIds: string[];
  instructorIds: string[];
  maxFacultyHours?: number;
  populationSize?: number;
  generations?: number;
};

type Gene = {
  day: string;
  startTime: string;
  endTime: string;
  roomId: string;
  instructorId: string;
};

function randomPick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function buildCandidatePool(p: GAParams): Gene[] {
  const pool: Gene[] = [];
  for (const day of WEEKDAYS) {
    for (const slot of TIME_SLOT_OPTIONS) {
      for (const roomId of p.roomIds) {
        for (const instructorId of p.instructorIds) {
          pool.push({
            day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            roomId,
            instructorId,
          });
        }
      }
    }
  }
  return pool;
}

function toBlock(g: Gene, id: string, sectionId: string, subjectId: string, academicPeriodId: string): ScheduleBlock {
  return {
    id,
    academicPeriodId,
    subjectId,
    instructorId: g.instructorId,
    sectionId,
    roomId: g.roomId,
    day: g.day,
    startTime: g.startTime,
    endTime: g.endTime,
  };
}

function fitness(
  g: Gene,
  p: GAParams,
  tempId: string,
  maxH: number,
): number {
  const block = toBlock(g, tempId, p.sectionId, p.subjectId, p.academicPeriodId);
  const others = p.universe.filter((x) => x.id !== p.excludeEntryId);
  const hits = detectConflictsForEntry(block, others);
  if (hits.length > 0) return -1e9;

  const dur = slotDurationHours(g.startTime, g.endTime);
  const withThis = [...others, block];
  const load = facultyWeeklyHours(g.instructorId, withThis);
  const loadPenalty = Math.max(0, load - maxH) * 500;
  const balancePenalty = load * 15; // soft: prefer lower overall load

  // Prefer mid-morning slots slightly (soft)
  const startMin = parseInt(g.startTime.split(":")[0]!, 10);
  const timePref = Math.abs(startMin - 9) * 2;

  return 10_000 - loadPenalty - balancePenalty - timePref + dur * 5;
}

function crossover(a: Gene, b: Gene, rng: () => number): Gene {
  // Uniform crossover with rule blend
  return {
    day: rng() < 0.5 ? a.day : b.day,
    startTime: rng() < 0.5 ? a.startTime : b.startTime,
    endTime: rng() < 0.5 ? a.endTime : b.endTime,
    roomId: rng() < 0.5 ? a.roomId : b.roomId,
    instructorId: rng() < 0.5 ? a.instructorId : b.instructorId,
  };
}

function mutate(g: Gene, pool: Gene[], rng: () => number): Gene {
  const p = randomPick(pool, rng);
  const field = Math.floor(rng() * 5);
  if (field === 0) return { ...g, day: p.day, startTime: p.startTime, endTime: p.endTime };
  if (field === 1) return { ...g, startTime: p.startTime, endTime: p.endTime };
  if (field === 2) return { ...g, roomId: p.roomId };
  if (field === 3) return { ...g, instructorId: p.instructorId };
  return { ...g, day: p.day };
}

/**
 * Returns ranked suggestions (highest fitness first). Uses GA search over valid gene space.
 */
export function runRuleBasedGeneticAlgorithm(
  params: GAParams,
  seed = 1,
): GASuggestion[] {
  const rng = mulberry32(seed);
  const maxH = params.maxFacultyHours ?? DEFAULT_MAX_FACULTY_HOURS_PER_WEEK;
  const pool = buildCandidatePool(params);
  if (pool.length === 0) return [];

  const popSize = Math.min(params.populationSize ?? 48, pool.length);
  const generations = params.generations ?? 35;
  const tempId = "ga-temp";

  let population: Gene[] = [];
  for (let i = 0; i < popSize; i++) population.push(randomPick(pool, rng));

  for (let gen = 0; gen < generations; gen++) {
    const scored = population.map((g) => ({
      g,
      f: fitness(g, params, tempId, maxH),
    }));
    scored.sort((a, b) => b.f - a.f);

    const next: Gene[] = [];
    const elite = scored.slice(0, Math.max(2, Math.floor(popSize / 2))).map((x) => x.g);
    next.push(...elite);

    while (next.length < popSize) {
      const p1 = randomPick(elite, rng);
      const p2 = randomPick(elite, rng);
      let child = crossover(p1, p2, rng);
      if (rng() < 0.25) child = mutate(child, pool, rng);
      next.push(child);
    }
    population = next.slice(0, popSize);
  }

  const final = population.map((g) => {
    const f = fitness(g, params, tempId, maxH);
    return { g, f };
  });
  final.sort((a, b) => b.f - a.f);

  const seen = new Set<string>();
  const out: GASuggestion[] = [];
  for (const { g, f } of final) {
    if (f < -1e8) continue;
    const key = `${g.day}|${g.startTime}|${g.roomId}|${g.instructorId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      day: g.day,
      startTime: g.startTime,
      endTime: g.endTime,
      roomId: g.roomId,
      instructorId: g.instructorId,
      fitness: f,
      label: `${g.day} ${g.startTime}–${g.endTime}`,
    });
    if (out.length >= 8) break;
  }
  return out;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
