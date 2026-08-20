/**
 * Derive curriculum year level (1–4) from section labels across programs (BSIT-3A, BSENVS-1A, EnviSci-2B, …).
 * Falls back to BSIT-specific prefixes when present.
 */

/** Match trailing year token: "...-1A", "... 2B", "...-4" */
const YEAR_SUFFIX = /(?:^|[-\s])([1-4])([A-Za-z]|\b)\s*$/;

export function yearLevelFromSchedulingSectionName(sectionName: string): number | null {
  const n = sectionName.trim();
  if (!n) return null;
  const m = n.match(YEAR_SUFFIX);
  if (m) {
    const y = parseInt(m[1]!, 10);
    if (y >= 1 && y <= 4) return y;
  }
  const u = n.replace(/\s+/g, "-").replace(/-+/g, "-").toUpperCase();
  if (u.startsWith("BSIT-1")) return 1;
  if (u.startsWith("BSIT-2")) return 2;
  if (u.startsWith("BSIT-3")) return 3;
  if (u.startsWith("BSIT-4")) return 4;
  return null;
}
