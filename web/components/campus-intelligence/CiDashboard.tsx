"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Users, BookOpen, DoorOpen, Percent, FileText, AlertTriangle } from "lucide-react";

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
};

const recentActivities = [
  {
    type: "submission",
    user: "Dr. Maria Santos",
    action: "submitted BSIT 3A schedule for approval",
    time: "5 minutes ago",
    status: "pending",
  },
  {
    type: "approval",
    user: "Dean Roberto Cruz",
    action: "approved BSCS 2B schedule",
    time: "15 minutes ago",
    status: "approved",
  },
  {
    type: "conflict",
    user: "System",
    action: "detected room conflict in Room 304 (Mon 10:00 AM)",
    time: "23 minutes ago",
    status: "warning",
  },
  {
    type: "justification",
    user: "Prof. Juan Dela Cruz",
    action: "requested justification for 24-unit teaching load",
    time: "1 hour ago",
    status: "pending",
  },
  {
    type: "submission",
    user: "Prof. Ana Reyes",
    action: "submitted BSED 1A schedule for review",
    time: "2 hours ago",
    status: "pending",
  },
  {
    type: "approval",
    user: "Dean Roberto Cruz",
    action: "approved faculty profile update for Dr. Santos",
    time: "3 hours ago",
    status: "approved",
  },
];

/**
 * Campus Intelligence Core dashboard (ported from Opticore-CampusIntelligence `Dashboard.tsx`).
 */
export function CiDashboard({ welcomeName, basePath, variant = "full" }: CiDashboardProps) {
  const stats = [
    { label: "Total Sections", value: "127", icon: BookOpen, color: "#FF990A" },
    { label: "Total Instructors", value: "45", icon: Users, color: "#780301" },
    { label: "Total Rooms", value: "38", icon: DoorOpen, color: "#4CAF50" },
    { label: "Room Utilization", value: "87%", icon: Percent, color: "#2196F3", progress: 87 },
    { label: "Pending Drafts", value: "12", icon: FileText, color: "#FFC107" },
    { label: "Conflicts Detected Today", value: "3", icon: AlertTriangle, color: "#F44336" },
  ];

  /** Program Chairman + College Admin + DOI: centralized `ScheduleEntry` (no workflow Inbox quick link). CAS keeps Inbox. */
  const fullQuickLinks: { label: string; href: string }[] = [
    { label: "Evaluator", href: `${basePath}/evaluator` },
    { label: "INS Form (Schedule View)", href: `${basePath}/ins/faculty` },
    { label: "Subject Codes", href: `${basePath}/subject-codes` },
    { label: "Faculty Profile", href: `${basePath}/faculty-profile` },
  ];
  if (basePath !== "/chairman" && basePath !== "/admin/college" && basePath !== "/doi") {
    fullQuickLinks.push({ label: "Inbox", href: `${basePath}/inbox` });
  }

  if (variant === "doi") {
    fullQuickLinks.push({ label: "Policy reviews", href: "/doi/reviews" });
  }

  const gecQuickLinks = [
    { label: "Central Hub Evaluator", href: "/admin/gec/evaluator" },
    { label: "INS · Faculty (5A)", href: "/admin/gec/ins/faculty" },
    { label: "INS · Section (5B)", href: "/admin/gec/ins/section" },
    { label: "INS · Room (5C)", href: "/admin/gec/ins/room" },
    { label: "Request Approval to Edit Vacant GEC Slots", href: "/admin/gec/request-access" },
    { label: "Campus navigation", href: "/campus-navigation" },
  ];

  const quickLinks = variant === "gec" ? gecQuickLinks : fullQuickLinks;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        {welcomeName ? (
          <p className="text-sm font-medium text-gray-600 mb-1">Welcome, {welcomeName}</p>
        ) : null}
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Campus Intelligence Core</h2>
        <p className="text-gray-600 text-sm">High-level view of today&apos;s academic activity and room usage.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <Icon className="w-8 h-8" style={{ color: stat.color }} />
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
              {stat.progress != null ? (
                <div className="mt-3 relative">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${stat.progress}%`, backgroundColor: stat.color }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <CiDashboardCharts />

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Access</h3>
        <div className="flex gap-3 flex-wrap">
          {quickLinks.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="bg-[#FF990A] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e88909] transition-colors text-center text-sm"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {recentActivities.map((activity, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div
                className={`w-2 h-2 rounded-full mt-2 ${
                  activity.status === "approved"
                    ? "bg-green-500"
                    : activity.status === "warning"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">
                  <span className="font-semibold">{activity.user}</span> {activity.action}
                </p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
              <span
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                  activity.status === "approved"
                    ? "bg-green-100 text-green-700"
                    : activity.status === "warning"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-blue-100 text-blue-700"
                }`}
              >
                {activity.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
