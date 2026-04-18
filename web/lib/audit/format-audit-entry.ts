import type { AuditEntry } from "@/components/audit/AuditLogViewer";

/** Readable action title for the Action column (English). */
export function formatAuditActionEnglish(action: string): string {
  const a = action.trim();
  switch (a) {
    case "gec.vacant_slot_save":
      return "GEC Chairman saved vacant GEC slot assignments";
    case "chairman.evaluator_save":
      return "Program Chairman saved schedule rows in Evaluator";
    case "hub.conflict_apply":
      return "Applied suggested schedule change from conflict check";
    case "schedule.write":
      return "Schedule entry update";
    default:
      return a.replace(/\./g, " · ");
  }
}

function pickStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function pickNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * One or two English sentences for the Details column (replaces raw JSON for known actions).
 */
export function formatAuditDetailsEnglish(entry: AuditEntry): string {
  const d = entry.details;
  const action = entry.action.trim();

  if (!d || typeof d !== "object") return "—";

  if (action === "gec.vacant_slot_save") {
    const n = pickNum((d as Record<string, unknown>).rowCount) ?? "?";
    const section = pickStr((d as Record<string, unknown>).sectionName);
    const tail = section ? ` for ${section}` : "";
    return `Saved ${n} vacant GEC row(s)${tail} for the selected term.`;
  }

  if (action === "chairman.evaluator_save") {
    const n = pickNum((d as Record<string, unknown>).rowCount) ?? "?";
    return `Wrote ${n} schedule row(s) to the master timetable for this college.`;
  }

  if (action === "hub.conflict_apply") {
    const applied = (d as Record<string, unknown>).applied as Record<string, unknown> | undefined;
    const day = applied && pickStr(applied.day);
    const st = applied && pickStr(applied.startTime);
    const et = applied && pickStr(applied.endTime);
    const when = day && st && et ? `${day} ${st}–${et}` : "a new time slot";
    return `Moved the conflicting class to ${when} using the suggested fix from the conflict checker.`;
  }

  try {
    return JSON.stringify(d);
  } catch {
    return String(d);
  }
}
