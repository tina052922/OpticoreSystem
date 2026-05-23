"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Users, BookOpen, DoorOpen, FileText, AlertTriangle, ChevronRight } from "lucide-react";

const CiDashboardCharts = dynamic(
  () => import("./CiDashboardCharts").then((m) => ({ default: m.CiDashboardCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[320px] rounded-lg bg-gray-100/80 animate-pulse border border-gray-200" />
        <div className="h-[320px] rounded-lg bg-gray-100/80 animate-pulse border border-gray-200" />
      </div>
    ),
  },
);

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
};

/**
 * Campus Intelligence Core dashboard (ported from Opticore-CampusIntelligence `Dashboard.tsx`).
 */
function fmtCount(n: number): string {
  return n.toLocaleString();
}

export function CiDashboard({
  welcomeName,
  basePath: _basePath,
  variant: _variant = "full",
  conflictBanner = null,
  liveStats = null,
  analyticsScope = null,
}: CiDashboardProps) {
  const stats = [
    {
      label: "Rooms",
      value: liveStats ? fmtCount(liveStats.roomCount) : "—",
      icon: DoorOpen,
      color: "#4CAF50",
    },
    {
      label: "Sections",
      value: liveStats ? fmtCount(liveStats.sectionCount) : "—",
      icon: BookOpen,
      color: "#FF990A",
    },
    {
      label: "Faculty",
      value: liveStats ? fmtCount(liveStats.facultyCount) : "—",
      icon: Users,
      color: "#780301",
    },
    {
      label: "Draft schedules (current term)",
      value: liveStats ? fmtCount(liveStats.draftScheduleCount) : "—",
      icon: FileText,
      color: "#FFC107",
    },
    {
      label: "Schedule conflicts (current term)",
      value: conflictBanner ? String(conflictBanner.conflictingRowCount) : "—",
      icon: AlertTriangle,
      color: conflictBanner ? "#F44336" : "#9E9E9E",
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

      {conflictBanner && conflictBanner.conflictingRowCount > 0 ? (
        <Link
          href={conflictBanner.evaluatorHref}
          className="block rounded-xl border-2 border-red-400/80 bg-gradient-to-r from-red-50 to-amber-50/90 p-4 sm:p-5 shadow-[0px_4px_12px_rgba(120,3,1,0.12)] hover:border-[#ff990a] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#780301]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-md">
                <AlertTriangle className="w-6 h-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-red-950">Conflicts detected today</h3>
                <p className="text-sm text-red-900/85 mt-0.5">
                  {conflictBanner.conflictingRowCount} schedule row(s) participate in a time overlap (faculty, room, or
                  section). Open the Evaluator to review details and suggested remedies.
                </p>
                {conflictBanner.previewLines.length > 0 ? (
                  <ul className="mt-2 text-[12px] text-red-950/80 space-y-1 list-disc pl-5 max-h-[7.5rem] overflow-y-auto">
                    {conflictBanner.previewLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-[#780301] shrink-0">
              Go to Evaluator
              <ChevronRight className="w-4 h-4" aria-hidden />
            </span>
          </div>
        </Link>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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

      <CiDashboardCharts analyticsScope={analyticsScope} />
    </div>
  );
}
