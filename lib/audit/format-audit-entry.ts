import type { AuditEntry } from "@/components/audit/AuditLogViewer";

/** "08:00:00" | "8:00" → "8:00 AM" */
export function formatTimeAmPm(hms: string): string {
  const raw = hms.trim();
  const base = raw.length > 5 ? raw.slice(0, 5) : raw;
  const [h, m] = base.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return raw;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatTimeRangeAmPm(start: string, end: string): string {
  return `${formatTimeAmPm(start)}–${formatTimeAmPm(end)}`;
}

type RowSummary = {
  subjectCode?: string;
  sectionName?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
};

function sentenceForRow(r: RowSummary): string {
  const code = (r.subjectCode ?? "—").trim() || "—";
  const sec = (r.sectionName ?? "").trim();
  const day = (r.day ?? "").trim();
  const st = r.startTime ? formatTimeAmPm(r.startTime) : "";
  const en = r.endTime ? formatTimeAmPm(r.endTime) : "";
  const slot = st && en ? `${st}–${en}` : st || "unspecified time";
  const sectionBit = sec ? ` to ${sec}` : "";
  const dayBit = day ? ` on ${day}` : "";
  return `${code}${sectionBit}${dayBit} at ${slot}`;
}

/** Readable action title for the Action column (English). */
export function formatAuditActionEnglish(action: string): string {
  const a = action.trim();
  switch (a) {
    case "gec.vacant_slot_save":
      return "Schedule updated";
    case "gec.vacant_schedule_saved":
      return "Schedule updated";
    case "chairman.evaluator_save":
      return "Schedule updated";
    case "chairman.evaluator_autosave":
      return "Schedule updated";
    case "chairman.conflict_apply":
      return "Conflict fix applied";
    case "chairman.policy_justification_upsert":
      return "Policy justification submitted";
    case "hub.conflict_apply":
      return "Conflict fix applied";
    case "hub.schedule_quick_patch":
      return "Schedule updated";
    case "hub.schedule_dialog_edit":
      return "Schedule updated";
    case "schedule.write":
      return "Schedule updated";
    case "access_request.submitted":
      return "Access request";
    case "access_request.approved":
      return "Access request";
    case "access_request.rejected":
      return "Access request";
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

function pickRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function describePatch(patch: Record<string, unknown>): string {
  const parts: string[] = [];
  if (pickStr(patch.day)) parts.push(`day → ${pickStr(patch.day)}`);
  if (pickStr(patch.startTime) || pickStr(patch.endTime)) {
    const s = pickStr(patch.startTime) ?? "?";
    const e = pickStr(patch.endTime) ?? "?";
    parts.push(`time → ${formatTimeRangeAmPm(s, e)}`);
  }
  if (pickStr(patch.roomId)) parts.push("room updated");
  if (pickStr(patch.instructorId)) parts.push("instructor updated");
  if (pickStr(patch.subjectId)) parts.push("subject updated");
  return parts.length > 0 ? parts.join("; ") : "fields updated";
}

/**
 * One or two English sentences for the Details column (replaces raw JSON for known actions).
 */
export function formatAuditDetailsEnglish(entry: AuditEntry): string {
  const d = entry.details;
  const action = entry.action.trim();

  if (!d || typeof d !== "object") return "—";

  const rec = d as Record<string, unknown>;

  const actor =
    action.startsWith("gec.") ? "GEC Chairman" : action.startsWith("chairman.") ? "Program Chairman" : action === "schedule.write" ? "User" : action.startsWith("hub.") ? "College Admin" : action.startsWith("access_request.") ? "College Admin" : action.startsWith("doi.") ? "DOI Admin" : "User";

  const rows = rec.rows;
  const firstRow =
    Array.isArray(rows) && rows.length > 0 ? (rows[0] as RowSummary) : null;
  const rowCount = pickNum(rec.rowCount) ?? pickNum(rec.upsertCount) ?? null;

  if (action === "gec.vacant_slot_save") {
    if (firstRow) {
      const countBit = rowCount && rowCount > 1 ? ` (${rowCount} changes)` : "";
      return `${actor} updated ${sentenceForRow(firstRow)}${countBit}.`;
    }
    return `${actor} updated vacant GEC slots.`;
  }

  if (action === "gec.vacant_schedule_saved") {
    const sec = pickStr(rec.sectionName);
    const rc = pickNum(rec.rowCount);
    const period = pickStr(rec.periodLabel);
    const bits = [
      sec ? `for ${sec}` : null,
      period ? `(${period})` : null,
      typeof rc === "number" ? `(${rc} changes)` : null,
    ].filter(Boolean);
    return `${actor} updated vacant GEC slots${bits.length ? ` ${bits.join(" ")}` : ""}.`;
  }

  if (action === "chairman.evaluator_save" || action === "chairman.evaluator_autosave") {
    if (firstRow) {
      const countBit = rowCount && rowCount > 1 ? ` (${rowCount} changes)` : "";
      return `${actor} updated ${sentenceForRow(firstRow)}${countBit}.`;
    }
    const upserts = pickNum(rec.upsertCount);
    const dels = pickNum(rec.deleteCount);
    const c = typeof upserts === "number" || typeof dels === "number" ? (upserts ?? 0) + (dels ?? 0) : null;
    return `${actor} updated the schedule${c && c > 1 ? ` (${c} changes)` : ""}.`;
  }

  if (action === "chairman.conflict_apply" || action === "hub.conflict_apply") {
    const applied = pickRecord(rec.applied);
    const sub = pickStr(rec.subjectCode) ?? "class";
    const sec = pickStr(rec.sectionName);
    if (applied) {
      const day = pickStr(applied.day) ?? "";
      const st = pickStr(applied.startTime) ?? "";
      const et = pickStr(applied.endTime) ?? "";
      const when = day && st && et ? `${day} at ${formatTimeRangeAmPm(st, et)}` : "a new time";
      const target = sec ? `${sub} (${sec})` : sub;
      return `${actor} moved ${target} to ${when}.`;
    }
    return `${actor} applied a conflict fix.`;
  }

  if (action === "hub.schedule_quick_patch" || action === "hub.schedule_dialog_edit") {
    const sub = pickStr(rec.subjectCode) ?? "Course";
    const sec = pickStr(rec.sectionName);
    const patch = pickRecord(rec.patch);
    const patchLine = patch ? describePatch(patch) : "schedule fields";
    const place = sec ? `${sub} · ${sec}` : sub;
    return `${actor} updated ${place} (${patchLine}).`;
  }

  if (action === "chairman.policy_justification_upsert") {
    return `${actor} submitted a load-policy justification.`;
  }

  if (action === "access_request.submitted") {
    const scopes = Array.isArray(rec.scopes) ? (rec.scopes as string[]).join(", ") : "—";
    return `Access requested (${scopes}).`;
  }

  if (action === "access_request.approved" || action === "access_request.rejected") {
    const scopes = Array.isArray(rec.scopes) ? (rec.scopes as string[]).join(", ") : "—";
    const verb = action === "access_request.approved" ? "Approved" : "Rejected";
    return `${verb} access (${scopes}).`;
  }

  try {
    return JSON.stringify(d);
  } catch {
    return String(d);
  }
}
