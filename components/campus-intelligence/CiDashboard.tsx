"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Users, BookOpen, DoorOpen, AlertTriangle, ChevronRight } from "lucide-react";
import { apiFetch, schedulingApi } from "@/lib/api/client";
import { useSemesterFilter } from "@/contexts/SemesterFilterContext";
import { useProgramMode } from "@/contexts/ProgramModeContext";
import { SYSTEM_CONFIG_RELOAD_EVENT } from "@/lib/system-configuration/system-config-reload";
import { useRealtimeEvent } from "@/hooks/use-realtime-event";
import { CiDashboardCharts } from "./CiDashboardCharts";

export type CiDashboardVariant = "full" | "gec" | "doi";

export type CiDashboardConflictBanner = {
  conflictingRowCount: number;
  previewLines: string[];
  evaluatorHref: string;
};

/** Live counts from Supabase — scope depends on role (see `getCampusIntelligenceStats`). */
export type CiDashboardLiveStats = {
  roomCount: number;
  sectionCount: number;
  facultyCount: number;
  draftScheduleCount: number;
  plottedScheduleCount?: number;
};

export type CiDashboardChartData = {
  roomUtilizationBySlot: Array<{ time: string; utilization: number }>;
  facultyLoadDistribution: Array<{ name: string; value: number; color: string }>;
};

export type CiDashboardProps = {
  /** Optional welcome line above the main title. */
  welcomeName?: string;
  /**
   * Base path without trailing slash (e.g. `/chairman`, `/admin/college`, `/doi`).
   * Used with `variant="full"` for quick links.
   */
  basePath: string;
  /** `full`: standard admin modules. `gec`: GEC chairman shortcuts. `doi`: adds policy reviews link in quick access. */
  variant?: CiDashboardVariant;
  /**
   * Live overlap scan for the current term (Evaluator scope). When present, shows an actionable “conflicts” card
   * and updates the stat tile — not calendar-specific; reflects the master schedule as it exists now.
   */
  conflictBanner?: CiDashboardConflictBanner | null;
  /** Real-time catalog + draft counts; omit to show placeholders (legacy). */
  liveStats?: CiDashboardLiveStats | null;
  /**
   * Dashboard analytics scope (for live charts).
   * Pages already compute `liveStats`; this tells the charts what slice to aggregate.
   */
  analyticsScope?: { mode: "program" | "college" | "campus"; collegeId?: string | null; programId?: string | null } | null;
  /**
   * Pre-fetched chart data from the server (avoids a duplicate client-side fetch).
   * When provided, `CiDashboardCharts` renders immediately without fetching.
   */
  chartsData?: CiDashboardChartData | null;
};

/**
 * Campus Intelligence Core dashboard (ported from Opticore-CampusIntelligence `Dashboard.tsx`).
 */
function fmtCount(n: number): string {
  return n.toLocaleString();
}

function conflictModeFor(
  variant: CiDashboardVariant,
  analyticsScope: CiDashboardProps["analyticsScope"],
): "chairman_program" | "college" | "gec_campus" | "doi_campus" {
  if (analyticsScope?.mode === "program") return "chairman_program";
  if (analyticsScope?.mode === "college") return "college";
  return variant === "gec" ? "gec_campus" : "doi_campus";
}

export function CiDashboard({
  welcomeName,
  basePath,
  variant = "full",
  conflictBanner = null,
  liveStats = null,
  analyticsScope = null,
  chartsData = null,
}: CiDashboardProps) {
  const { selectedPeriodId, ready } = useSemesterFilter();
  const { programMode } = useProgramMode();
  const [statsLive, setStatsLive] = useState(liveStats);
  const [chartsLive, setChartsLive] = useState(chartsData);
  const [conflictsLive, setConflictsLive] = useState(conflictBanner);
  const [reloadTick, setReloadTick] = useState(0);

  useRealtimeEvent("config.changed", () => setReloadTick((n) => n + 1));
  useRealtimeEvent("period.changed", () => setReloadTick((n) => n + 1));

  useEffect(() => {
    const onReload = () => setReloadTick((n) => n + 1);
    window.addEventListener(SYSTEM_CONFIG_RELOAD_EVENT, onReload);
    return () => window.removeEventListener(SYSTEM_CONFIG_RELOAD_EVENT, onReload);
  }, []);

  useEffect(() => {
    setStatsLive(liveStats);
    setChartsLive(chartsData);
    setConflictsLive(conflictBanner);
  }, [liveStats, chartsData, conflictBanner]);

  useEffect(() => {
    if (!ready || !selectedPeriodId || !analyticsScope) return;
    let cancelled = false;
    void (async () => {
      try {
        const qs = new URLSearchParams();
        qs.set("mode", analyticsScope.mode);
        if (analyticsScope.collegeId) qs.set("collegeId", analyticsScope.collegeId);
        if (analyticsScope.programId) qs.set("programId", analyticsScope.programId);
        qs.set("periodId", selectedPeriodId);
        const data = await apiFetch<
          CiDashboardLiveStats &
            CiDashboardChartData & { plottedScheduleCount?: number; standardWeeklyTeachingHours?: number }
        >(`/api/analytics/dashboard?${qs.toString()}`, { method: "GET", forceRefresh: true });
        if (cancelled) return;
        setStatsLive({
          roomCount: data.roomCount,
          sectionCount: data.sectionCount,
          facultyCount: data.facultyCount,
          draftScheduleCount: data.plottedScheduleCount ?? data.draftScheduleCount,
          plottedScheduleCount: data.plottedScheduleCount ?? data.draftScheduleCount,
        });
        setChartsLive({
          roomUtilizationBySlot: data.roomUtilizationBySlot ?? [],
          facultyLoadDistribution: data.facultyLoadDistribution ?? [],
        });
      } catch {
        /* keep server-rendered stats */
      }
      try {
        const scan = await schedulingApi.scopeConflictScan({
          academicPeriodId: selectedPeriodId,
          mode: conflictModeFor(variant, analyticsScope),
          collegeId: analyticsScope.collegeId ?? null,
          programId: analyticsScope.programId ?? null,
          programMode,
        });
        if (cancelled) return;
        const href =
          variant === "gec"
            ? "/admin/gec/evaluator"
            : variant === "doi"
              ? "/doi/evaluator"
              : analyticsScope.mode === "college"
                ? "/admin/college/evaluator"
                : "/chairman/evaluator";
        setConflictsLive({
          conflictingRowCount: scan.conflictingEntryIds?.length ?? 0,
          previewLines: (scan.issueSummaries ?? []).slice(0, 3),
          evaluatorHref: href,
        });
      } catch {
        /* keep server-rendered conflicts */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, selectedPeriodId, analyticsScope, variant, programMode, reloadTick]);

  const stats = [
    {
      label: "Rooms",
      value: statsLive ? fmtCount(statsLive.roomCount) : "—",
      icon: DoorOpen,
      color: "#4CAF50",
    },
    {
      label: "Sections",
      value: statsLive ? fmtCount(statsLive.sectionCount) : "—",
      icon: BookOpen,
      color: "#FF990A",
    },
    {
      label: "Faculty",
      value: statsLive ? fmtCount(statsLive.facultyCount) : "—",
      icon: Users,
      color: "#780301",
    },
    {
      label: "Schedule conflicts (selected term)",
      value: conflictsLive ? String(conflictsLive.conflictingRowCount) : "—",
      icon: AlertTriangle,
      color: conflictsLive && conflictsLive.conflictingRowCount > 0 ? "#F44336" : "#9E9E9E",
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        {welcomeName ? (
          <p className="text-sm font-medium text-gray-600 mb-1">Welcome, {welcomeName}</p>
        ) : null}
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Campus Intelligence Core</h2>
      </div>

      {variant === "full" && basePath.includes("/admin/college") ? (
        <Link
          href="/admin/college/system-configuration"
          className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#780301] hover:border-[#ff990a] shadow-sm"
        >
          System Configuration
          <ChevronRight className="w-4 h-4" aria-hidden />
        </Link>
      ) : null}

      {conflictsLive && conflictsLive.conflictingRowCount > 0 ? (
        <Link
          href={conflictsLive.evaluatorHref}
          className="block rounded-xl border-2 border-red-400/80 bg-linear-to-r from-red-50 to-amber-50/90 p-4 sm:p-5 shadow-[0px_4px_12px_rgba(120,3,1,0.12)] hover:border-opticore-orange transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opticore-red-1"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-md">
                <AlertTriangle className="w-6 h-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-red-950">Conflicts detected today</h3>
                <p className="text-sm text-red-900/85 mt-0.5">
                  {conflictsLive.conflictingRowCount} schedule row(s) participate in a time overlap (faculty, room, or
                  section). Open the Evaluator to review details and suggested remedies.
                </p>
                {conflictsLive.previewLines.length > 0 ? (
                  <ul className="mt-2 text-xs text-red-950/80 space-y-1 list-disc pl-5 max-h-30 overflow-y-auto">
                    {conflictsLive.previewLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-opticore-red-1 shrink-0">
              Go to Evaluator
              <ChevronRight className="w-4 h-4" aria-hidden />
            </span>
          </div>
        </Link>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <Icon className="w-8 h-8" style={{ color: stat.color }} />
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600 leading-snug">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <CiDashboardCharts analyticsScope={analyticsScope} chartsData={chartsLive} />
    </div>
  );
}
