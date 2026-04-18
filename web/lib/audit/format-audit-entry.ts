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
  /** e.g. “Added GEC-RPH to BSIT 3A on Monday at 8:00 AM–9:00 AM.” */
  return `Added ${code}${sectionBit}${dayBit} at ${slot}.`;
}

function formatRowSummaries(rows: unknown, intro: string, maxLines = 8): string {
  if (!Array.isArray(rows) || rows.length === 0) return intro;
  const lines: string[] = [intro];
  const slice = rows.slice(0, maxLines) as RowSummary[];
  for (const r of slice) {
    lines.push(`• ${sentenceForRow(r)}`);
  }
  if (rows.length > maxLines) {
    lines.push(`• …and ${rows.length - maxLines} more.`);
  }
  return lines.join("\n");
}

/** Readable action title for the Action column (English). */
export function formatAuditActionEnglish(action: string): string {
  const a = action.trim();
  switch (a) {
    case "gec.vacant_slot_save":
      return "GEC Chairman updated vacant GEC schedule slots";
    case "gec.vacant_schedule_saved":
      return "GEC Chairman saved vacant GEC assignments (notification log)";
    case "chairman.evaluator_save":
      return "Program Chairman saved the master schedule";
    case "chairman.evaluator_autosave":
      return "Program Chairman autosaved schedule drafts";
    case "chairman.conflict_apply":
      return "Program Chairman applied a suggested fix from the conflict checker";
    case "chairman.policy_justification_upsert":
      return "Program Chairman submitted load-policy justification for VPAA";
    case "hub.conflict_apply":
      return "Campus Hub applied a suggested fix from the conflict checker";
    case "hub.schedule_quick_patch":
      return "Campus Hub quick-edited a schedule row";
    case "hub.schedule_dialog_edit":
      return "Campus Hub edited a schedule row (dialog)";
    case "schedule.write":
      return "Schedule entry update";
    case "access_request.submitted":
      return "Access request submitted";
    case "access_request.approved":
      return "Access request approved";
    case "access_request.rejected":
      return "Access request rejected";
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

  if (action === "gec.vacant_slot_save") {
    const n = pickNum(rec.rowCount) ?? "?";
    const section = pickStr(rec.sectionName);
    const rows = rec.rows;
    const head = `GEC Chairman saved ${n} vacant GEC row(s)${section ? ` for section ${section}` : ""} for the selected term.`;
    if (Array.isArray(rows) && rows.length > 0) {
      return formatRowSummaries(rows, head, 10);
    }
    return head;
  }

  if (action === "gec.vacant_schedule_saved") {
    const sec = pickStr(rec.sectionName) ?? "the section";
    const rc = pickNum(rec.rowCount) ?? "?";
    const period = pickStr(rec.periodLabel) ?? "the selected term";
    return `GEC Chairman recorded ${rc} vacant GEC slot change(s) for ${sec} (${period}). College staff can review this in the evaluator and INS forms.`;
  }

  if (action === "chairman.evaluator_save" || action === "chairman.evaluator_autosave") {
    const upserts = pickNum(rec.upsertCount);
    const rowCount = pickNum(rec.rowCount);
    const dels = pickNum(rec.deleteCount);
    const count = upserts ?? rowCount ?? 0;
    const rows = rec.rows;
    const autosave = action === "chairman.evaluator_autosave";
    const head = autosave
      ? `Program Chairman autosaved drafts (${count} row(s) written${dels ? `, ${dels} removed` : ""}).`
      : `Program Chairman saved the master timetable (${count} row(s) written${dels ? `, ${dels} removed` : ""}).`;
    if (Array.isArray(rows) && rows.length > 0) {
      return formatRowSummaries(rows, head, 8);
    }
    return head;
  }

  if (action === "chairman.conflict_apply" || action === "hub.conflict_apply") {
    const applied = pickRecord(rec.applied);
    const sub = pickStr(rec.subjectCode) ?? "class";
    const sec = pickStr(rec.sectionName);
    const who = action === "hub.conflict_apply" ? "Campus Hub" : "Program Chairman";
    if (applied) {
      const day = pickStr(applied.day) ?? "";
      const st = pickStr(applied.startTime) ?? "";
      const et = pickStr(applied.endTime) ?? "";
      const when =
        day && st && et ? `${day} at ${formatTimeRangeAmPm(st, et)}` : "a new day and time";
      const target = sec ? `${sub} (${sec})` : sub;
      return `${who} moved ${target} to ${when} using the conflict checker suggestion.`;
    }
    return `${who} applied a conflict-check suggestion for a schedule row.`;
  }

  if (action === "hub.schedule_quick_patch" || action === "hub.schedule_dialog_edit") {
    const sub = pickStr(rec.subjectCode) ?? "Course";
    const sec = pickStr(rec.sectionName);
    const patch = pickRecord(rec.patch);
    const patchLine = patch ? describePatch(patch) : "schedule fields";
    const place = sec ? `${sub} · ${sec}` : sub;
    return `Campus Hub updated ${place}: ${patchLine}.`;
  }

  if (action === "chairman.policy_justification_upsert") {
    return "Chairman saved or updated the faculty load justification text for VPAA / DOI review for this college and term.";
  }

  if (action === "access_request.submitted") {
    const scopes = Array.isArray(rec.scopes) ? (rec.scopes as string[]).join(", ") : "—";
    const note = pickStr(rec.note);
    return `Requested access scopes: ${scopes}.${note ? ` Note: ${note}` : ""}`;
  }

  if (action === "access_request.approved" || action === "access_request.rejected") {
    const scopes = Array.isArray(rec.scopes) ? (rec.scopes as string[]).join(", ") : "—";
    const exp = pickStr(rec.expiresAt);
    const verb = action === "access_request.approved" ? "Approved" : "Rejected";
    return `${verb} access for scopes: ${scopes}.${exp ? ` Expires: ${exp}.` : ""}`;
  }

  try {
    return JSON.stringify(d);
  } catch {
    return String(d);
  }
}
