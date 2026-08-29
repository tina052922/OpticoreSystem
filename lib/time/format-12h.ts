/**
 * Display-only: convert 24h HH:MM strings from the database into 12-hour labels.
 */

function normalizeHHMM(t: string | null | undefined): { h: number; m: number } | null {
  if (typeof t !== "string") return null;
  const raw = t.trim().slice(0, 5);
  if (!raw) return null;
  const [a, b] = raw.split(":");
  const h = parseInt(a, 10);
  const m = parseInt(b, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h: ((h % 24) + 24) % 24, m: ((m % 60) + 60) % 60 };
}

export function formatHHMMTo12h(hhmm: string | null | undefined): string {
  const n = normalizeHHMM(hhmm);
  if (!n) return typeof hhmm === "string" ? hhmm.trim() : "";
  const { h, m } = n;
  const isPm = h >= 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${isPm ? "PM" : "AM"}`;
}

/** e.g. `"1:00 PM – 4:00 PM"` */
export function formatTimeRange12h(startHHMM: string | null | undefined, endHHMM: string | null | undefined): string {
  const start = formatHHMMTo12h(startHHMM);
  const end = formatHHMMTo12h(endHHMM);
  if (!start && !end) return "—";
  return `${start || "—"} – ${end || "—"}`;
}
