/**
 * Map CTU Argao–style section codes embedded in `Section.name` (e.g. "BSIT 3A") to curriculum year level.
 * 1A / 1B / 1C → 1st year; 2A / 2B → 2nd; 3A / 3B → 3rd; 4A / 4B → 4th.
 */
export function parseGecYearLevelFromSectionName(sectionName: string): number | null {
  const s = sectionName.trim();
  if (!s) return null;
  // e.g. "BSIT 3A", "BSCS 1B", "Section 2A"
  const m = s.match(/\b([1-4])\s*([A-Za-z])\b/);
  if (!m?.[1] || !m[2]) return null;
  const y = parseInt(m[1], 10);
  const letter = m[2].toUpperCase();
  if (y === 1 && !["A", "B", "C"].includes(letter)) return null;
  if (y >= 2 && y <= 4 && !["A", "B"].includes(letter)) return null;
  return y;
}
