/**
 * Nav items for CampusIntelligenceShell. Use `icon` string keys only — Server Components cannot pass
 * Lucide components into Client Components (serialization error / 500).
 */
export type NavIconKey =
  | "LayoutDashboard"
  | "BookOpen"
  | "ClipboardList"
  | "Inbox"
  | "UserCircle"
  | "UserPlus"
  | "Layers"
  | "Send"
  | "MapPin"
  | "Building2"
  | "Scale"
  | "CalendarPlus"
  | "KeyRound"
  | "History"
  | "Megaphone"
  | "Settings"
  | "Network";

export type AdminNavItem = {
  label: string;
  href: string;
  icon?: NavIconKey;
};

/** Sidebar / shell label for schedule-view routes (formerly “INS Form”). */
export const LOAD_GENERATOR_NAV_LABEL = "Load Generator";

/** Chairman: full campus scheduling authority. */
export const CHAIRMAN_NAV: AdminNavItem[] = [
  { label: "Campus Intelligence", href: "/chairman/dashboard", icon: "LayoutDashboard" },
  { label: LOAD_GENERATOR_NAV_LABEL, href: "/chairman/ins?tab=faculty", icon: "BookOpen" },
  { label: "Evaluator", href: "/chairman/evaluator", icon: "ClipboardList" },
  { label: "Faculty Profile", href: "/chairman/faculty-profile", icon: "UserCircle" },
  { label: "Pending Instructors", href: "/chairman/pending-instructors", icon: "UserPlus" },
  { label: "Subject Codes", href: "/chairman/subject-codes", icon: "Layers" },
  { label: "Campus navigation", href: "/campus-navigation", icon: "MapPin" },
];

/** College Admin — same shell as Chairman; campus-wide scope with college/department filters. */
export const COLLEGE_ADMIN_NAV: AdminNavItem[] = [
  { label: "Campus Intelligence", href: "/admin/college", icon: "LayoutDashboard" },
  { label: LOAD_GENERATOR_NAV_LABEL, href: "/admin/college/ins", icon: "BookOpen" },
  { label: "Evaluator", href: "/admin/college/evaluator", icon: "ClipboardList" },
  { label: "Summary of Teaching Load", href: "/admin/college/teaching-load-summary", icon: "CalendarPlus" },
  { label: "Load justifications", href: "/admin/college/policy-reviews", icon: "Scale" },
  { label: "Audit log", href: "/admin/college/audit-log", icon: "History" },
  { label: "Faculty Profile", href: "/admin/college/faculty-profile", icon: "UserCircle" },
  { label: "Subject Codes", href: "/admin/college/subject-codes", icon: "Layers" },
  { label: "Programs & Sections", href: "/admin/college/academic-structure", icon: "Network" },
  { label: "Buildings & Rooms", href: "/admin/college/buildings-rooms", icon: "Building2" },
  { label: "Campus navigation", href: "/campus-navigation", icon: "MapPin" },
  { label: "System Configuration", href: "/admin/college/system-configuration", icon: "Settings" },
];

/** CAS Admin */
export const CAS_ADMIN_NAV: AdminNavItem[] = [
  { label: "Campus Intelligence", href: "/admin/cas", icon: "LayoutDashboard" },
  { label: LOAD_GENERATOR_NAV_LABEL, href: "/admin/cas/ins/faculty", icon: "BookOpen" },
  { label: "Central Hub Evaluator", href: "/admin/cas/evaluator", icon: "ClipboardList" },
  { label: "GEC distribution", href: "/admin/cas/distribution", icon: "Send" },
  { label: "Inbox", href: "/admin/cas/inbox", icon: "Inbox" },
  { label: "Audit log", href: "/admin/cas/audit-log", icon: "History" },
  { label: "Faculty Profile", href: "/admin/cas/faculty-profile", icon: "UserCircle" },
  { label: "Subject Codes", href: "/admin/cas/subject-codes", icon: "Layers" },
  { label: "Campus navigation", href: "/campus-navigation", icon: "MapPin" },
];

/**
 * GEC Chairman — Campus Intelligence + Load Generator + Central Hub.
 * Vacant GEC cells are editable within the selected college / department; major rows stay read-only.
 */
export const GEC_CHAIRMAN_NAV: AdminNavItem[] = [
  { label: "Campus Intelligence", href: "/admin/gec", icon: "LayoutDashboard" },
  { label: LOAD_GENERATOR_NAV_LABEL, href: "/admin/gec/ins", icon: "BookOpen" },
  { label: "Central Hub Evaluator", href: "/admin/gec/evaluator", icon: "ClipboardList" },
  { label: "Faculty Profile", href: "/admin/gec/faculty-profile", icon: "UserCircle" },
  { label: "Subject Codes", href: "/admin/gec/subject-codes", icon: "Layers" },
  { label: "Campus navigation", href: "/campus-navigation", icon: "MapPin" },
];

/** Instructor (faculty portal) — Campus Intelligence shell + semester filter. */
export const INSTRUCTOR_NAV: AdminNavItem[] = [
  { label: "Campus Intelligence", href: "/faculty", icon: "LayoutDashboard" },
  // Load Generator was a second door to the same schedules, and an unfiltered one. Its Faculty,
  // Section and Room views now live under My schedule, each limited to this instructor's classes.
  { label: "My schedule", href: "/faculty/schedule", icon: "CalendarPlus" },
  { label: "Campus navigation", href: "/campus-navigation", icon: "MapPin" },
];

/** Student portal. Icons match the admin shells, so the same page reads the same everywhere. */
export const STUDENT_PORTAL_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: "/student", icon: "LayoutDashboard" },
  { label: "My schedule", href: "/student/schedule", icon: "CalendarPlus" },
  { label: LOAD_GENERATOR_NAV_LABEL, href: "/student/ins?tab=section", icon: "BookOpen" },
  { label: "Profile", href: "/student/profile", icon: "UserCircle" },
  { label: "Campus navigation", href: "/campus-navigation", icon: "MapPin" },
];

/** DOI / VPAA */
export const DOI_ADMIN_NAV: AdminNavItem[] = [
  { label: "Campus Intelligence", href: "/doi/dashboard", icon: "LayoutDashboard" },
  { label: LOAD_GENERATOR_NAV_LABEL, href: "/doi/ins?tab=faculty", icon: "BookOpen" },
  /**
   * The hub, not the campus-wide plotter.
   *
   * DOI works across every college, so the first thing this page owes them is the choice of which
   * one. Without `?hub=1` the link opened the campus-wide timetable, where `?college=` means
   * nothing — so the colleges were a tab they had to find, and a college opened from elsewhere
   * showed every college's programs. `isNavItemActive` compares pathnames, so the query does not
   * affect highlighting.
   */
  { label: "Central Hub Evaluator", href: "/doi/evaluator?hub=1", icon: "ClipboardList" },
  { label: "Load justifications", href: "/doi/reviews", icon: "Scale" },
  { label: "Audit log", href: "/doi/audit-log", icon: "History" },
  { label: "Faculty Profile", href: "/doi/faculty-profile", icon: "UserCircle" },
  { label: "College Admins & Chairmen", href: "/doi/campus-accounts", icon: "UserPlus" },
  { label: "Subject Codes", href: "/doi/subject-codes", icon: "Layers" },
  { label: "Programs & Sections", href: "/doi/academic-structure", icon: "Network" },
  { label: "Buildings & Rooms", href: "/doi/buildings-rooms", icon: "Building2" },
  { label: "Campus navigation", href: "/campus-navigation", icon: "MapPin" },
  { label: "System Configuration", href: "/doi/system-configuration", icon: "Settings" },
];
