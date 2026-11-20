"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { formatAuditActionEnglish, formatAuditDetailsEnglish } from "@/lib/audit/format-audit-entry";
import { auditLogApi } from "@/lib/api/client";
import { markAuditLogPageSeen } from "@/hooks/use-audit-log-unread-count";
import { useActionToast } from "@/components/alerts/useActionToast";
import { ShowMoreRows, useIncrementalList } from "@/hooks/use-incremental-list";
import { Input } from "@/components/ui/input";

export type AuditEntry = {
  id: string;
  actorId: string;
  actorName?: string;
  collegeId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export type AuditLogViewerProps = {
  /** Must match `auditLogUnreadScope` on `CampusIntelligenceShell` so the sidebar badge clears after a visit. */
  auditUnreadScope?: string;
};

/** How many entries one load brings back; the date range narrows further on the server. */
const LOAD_LIMIT = 500;

const selectClass =
  "h-9 rounded-md border border-black/15 bg-white px-2 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-[#780301]/20";

/** The entry as the table shows it — what the search box matches against. */
type DisplayRow = {
  entry: AuditEntry;
  time: string;
  user: string;
  action: string;
  entity: string;
  message: string;
  haystack: string;
};

function norm(v: string): string {
  return v.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Audit Log (DOI, College Admin, CAS): the latest entries, searchable.
 *
 * Search matches the text on screen — date, time, user, action, entity and message — so what someone
 * reads in a row is what they can find it by. Action and Entity dropdowns narrow the list, and the
 * date range is applied on the server so it can reach past the newest 500 entries.
 */
export function AuditLogViewer({ auditUnreadScope = "college" }: AuditLogViewerProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const toast = useActionToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditLogApi.list({ limit: LOAD_LIMIT, from: from || undefined, to: to || undefined });
      setEntries(data.entries as AuditEntry[]);
      markAuditLogPageSeen(auditUnreadScope);
    } catch (e) {
      toast.fail(e, "Could not load the audit log", "audit log");
    } finally {
      setLoading(false);
    }
    // `toast` is a stable action-toast handle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditUnreadScope, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo((): DisplayRow[] => {
    return entries.map((e) => {
      const d = new Date(e.createdAt);
      const time = Number.isNaN(d.getTime()) ? e.createdAt : d.toLocaleString();
      const user = e.actorName ?? e.actorId;
      const action = formatAuditActionEnglish(e.action);
      const entity = e.entityType + (e.entityId ? ` · ${e.entityId.slice(0, 8)}…` : "");
      const message = formatAuditDetailsEnglish(e);
      return {
        entry: e,
        time,
        user,
        action,
        entity,
        message,
        // Raw action and full entity id too, so a code pasted from elsewhere still finds the row.
        haystack: norm([time, user, action, e.action, entity, e.entityId ?? "", message].join(" | ")),
      };
    });
  }, [entries]);

  const actionOptions = useMemo(
    () => [...new Set(rows.map((r) => r.action))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );
  const entityOptions = useMemo(
    () => [...new Set(rows.map((r) => r.entry.entityType))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const visible = useMemo(() => {
    const words = norm(query).split(" ").filter(Boolean);
    return rows.filter((r) => {
      if (actionFilter && r.action !== actionFilter) return false;
      if (entityFilter && r.entry.entityType !== entityFilter) return false;
      // Every typed word must appear somewhere in the row ("vilia schedule" = both).
      return words.every((w) => r.haystack.includes(w));
    });
  }, [rows, query, actionFilter, entityFilter]);

  const filtering = Boolean(query.trim() || actionFilter || entityFilter || from || to);
  // Draw 20 rows at a time; a new search or filter starts again at 20.
  const page = useIncrementalList(visible, `${query}|${actionFilter}|${entityFilter}|${from}|${to}|${rows.length}`);

  function clearAll() {
    setQuery("");
    setActionFilter("");
    setEntityFilter("");
    setFrom("");
    setTo("");
  }

  return (
    <div className="space-y-3">
      {/* ── Search and filters ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-black/10 bg-white p-3 space-y-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
          <label className="flex-1 min-w-[220px] space-y-1">
            <span className="text-[11px] font-semibold text-black/60">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Date, time, user, action, entity or message…"
                className="h-9 pl-8 pr-8 text-[12px]"
                autoComplete="off"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-black/40 hover:text-black/70"
                  onClick={() => setQuery("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-black/60">Action</span>
            <select className={`${selectClass} w-full lg:w-44`} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">All actions</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-black/60">Entity</span>
            <select className={`${selectClass} w-full lg:w-40`} value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="">All entities</option>
              {entityOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-black/60">From</span>
            <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="h-9 text-[12px] lg:w-40" />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-black/60">To</span>
            <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-9 text-[12px] lg:w-40" />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-black/55">
          <span>
            {loading
              ? "Loading…"
              : filtering
                ? `${visible.length} of ${entries.length} entr${entries.length === 1 ? "y" : "ies"} match`
                : `Latest ${entries.length} entr${entries.length === 1 ? "y" : "ies"}`}
            {!loading && entries.length >= LOAD_LIMIT && !from && !to
              ? " — set a date range to search further back."
              : ""}
          </span>
          {filtering ? (
            <button type="button" className="font-semibold text-[#780301] hover:underline" onClick={clearAll}>
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Compact table: capped height, sticky header ──────────────────── */}
      <div className="max-h-[60vh] overflow-auto overscroll-contain rounded-lg border border-black/10">
        <table className="w-full text-left text-[11.5px] leading-tight">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#780301] text-white">
              <th className="px-2 py-1.5 font-semibold">Time</th>
              <th className="px-2 py-1.5 font-semibold">User</th>
              <th className="px-2 py-1.5 font-semibold">Action</th>
              <th className="px-2 py-1.5 font-semibold">Entity</th>
              <th className="px-2 py-1.5 font-semibold">Message</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-black/50">
                  {loading
                    ? "Loading…"
                    : entries.length === 0
                      ? "No audit entries yet. Access requests, Chairperson/GEC schedule writes, and CAS/DOI workflow events appear here."
                      : "No entries match your search."}
                </td>
              </tr>
            ) : (
              page.visible.map((r) => (
                <tr key={r.entry.id} className="border-t border-black/10 align-top hover:bg-black/[0.02]">
                  <td className="px-2 py-1 whitespace-nowrap tabular-nums text-black/80">{r.time}</td>
                  <td className="px-2 py-1 whitespace-nowrap">{r.user}</td>
                  <td className="px-2 py-1 text-black/90">{r.action}</td>
                  <td className="px-2 py-1 whitespace-nowrap">
                    {r.entry.entityType}
                    {r.entry.entityId ? <span className="text-black/45"> · {r.entry.entityId.slice(0, 8)}…</span> : null}
                  </td>
                  <td className="px-2 py-1 max-w-xl text-black/85">{r.message}</td>
                </tr>
              ))
            )}
            <ShowMoreRows hasMore={page.hasMore} shown={page.shown} total={page.total} onMore={page.showMore} colSpan={5} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
