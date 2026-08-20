/**
 * Display-only: convert 24h HH:MM strings from the database into 12-hour labels.
 */

function normalizeHHMM(t: string): { h: number; m: number } | null {
  const raw = t.trim().slice(0, 5);
  const [a, b] = raw.split(":");
  const h = parseInt(a, 10);
  const m = parseInt(b, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h: ((h % 24) + 24) % 24, m: ((m % 60) + 60) % 60 };
}

export function formatHHMMTo12h(hhmm: string): string {
  const n = normalizeHHMM(hhmm);
  if (!n) return hhmm.trim();
  const { h, m } = n;
  const isPm = h >= 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${isPm ? "PM" : "AM"}`;
}

/** e.g. `"1:00 PM – 4:00 PM"` */
export function formatTimeRange12h(startHHMM: string, endHHMM: string): string {
  return `${formatHHMMTo12h(startHHMM)} – ${formatHHMMTo12h(endHHMM)}`;
}
