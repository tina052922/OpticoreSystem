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
  | "Layers"
  | "Send"
  | "MapPin"
  | "Scale"
  | "CalendarPlus"
  | "KeyRound"
  | "History"
  | "Megaphone";

export type AdminNavItem = {
  label: string;
  href: string;
  icon?: NavIconKey;
};

/** Chairman: full campus scheduling authority. */
export const CHAIRMAN_NAV: AdminNavItem[] = [
  { label: "Campus Intelligence", href: "/chairman/dashboard", icon: "LayoutDashboard" },
  { label: "INS Form (Schedule View)", href: "/chairman/ins/faculty", icon: "BookOpen" },
  { label: "Evaluator", href: "/chairman/evaluator", icon: "ClipboardList" },
  { label: "Faculty Profile", href: "/chairman/faculty-profile", icon: "UserCircle" },
  { label: "Subject Codes", href: "/chairman/subject-codes", icon: "Layers" },
  { label: "Campus navigation", href: "/campus-navigation", icon: "MapPin" },
];

/** College Admin — same shell as Chairman; campus-wide scope with college/department filters. */
export const COLLEGE_ADMIN_NAV: AdminNavItem[] = [
  { label: "Campus Intelligence", href: "/admin/college", icon: "LayoutDashboard" },
  { label: "INS Form (Schedule View)", href: "/admin/college/ins", icon: "BookOpen" },
  { label: "Central Hub Evaluator", href: "/admin/college/evaluator", icon: "ClipboardList" },
  { label: "Schedule change requests", href: "/admin/college/schedule-change-requests", icon: "ClipboardList" },
  { label: "Access requests", href: "/admin/college/access-requests", icon: "KeyRound" },
  { label: "Audit log", href: "/admin/college/audit-log", icon: "History" },
  { label: "Faculty Profile", href: "/admin/college/faculty-profile", icon: "UserCircle" },
  { label: "Subject Codes", href: "/admin/college/subject-codes", icon: "Layers" },
  { label: "Campus navigation", href: "/campus-navigation", icon: "MapPin" },
];

/** CAS Admin */
export const CAS_ADMIN_NAV: AdminNavItem[] = [
  { label: "Campus Intelligence", href: "/admin/cas", icon: "LayoutDashboard" },
  { label: "INS Form (Schedule View)", href: "/admin/cas/ins/faculty", icon: "BookOpen" },
  { label: "Central Hub Evaluator", href: "/admin/cas/evaluator", icon: "ClipboardList" },
  { label: "GEC distribution", href: "/admin/cas/distribution", icon: "Send" },
  { label: "Inbox", href: "/admin/cas/inbox", icon: "Inbox" },
  { label: "Audit log", href: "/admin/cas/audit-log", icon: "History" },
  { label: "Faculty Profile", href: "/admin/cas/faculty-profile", icon: "UserCircle" },
  { label: "Subject Codes", href: "/admin/cas/subject-codes", icon: "Layers" },
  { label: "Campus navigation", href: "/campus-navigation", icon: "MapPin" },
];

/**
 * GEC Chairman — same shell as College Admin: Campus Intelligence + INS (faculty / section / room) + Central Hub.
 * INS pages reuse `INSForm*` with `campusWide` (all colleges); vacant GEC cells are highlighted in the grids.
 */
export const GEC_CHAIRMAN_NAV: AdminNavItem[] = [
  { label: "Campus Intelligence", href: "/admin/gec", icon: "LayoutDashboard" },
  { label: "INS Forms Schedule View", href: "/admin/gec/ins", icon: "BookOpen" },
  { label: "Central Hub Evaluator", href: "/admin/gec/evaluator", icon: "ClipboardList" },
  { label: "Campus navigation", href: "/campus-navigation", icon: "MapPin" },
];

/** Instructor (faculty portal) — Campus Intelligence shell + semester filter. */
export const INSTRUCTOR_NAV: AdminNavItem[] = [
  { label: "Campus Intelligence", href: "/faculty", icon: "LayoutDashboard" },
  { label: "INS Forms Schedule View", href: "/faculty/ins", icon: "BookOpen" },
  { label: "My Schedule", href: "/faculty/schedule", icon: "CalendarPlus" },
  { label: "Announcements", href: "/faculty/announcements", icon: "Megaphone" },
  { label: "Campus navigation", href: "/campus-navigation", icon: "MapPin" },
];

/** DOI / VPAA */
export const DOI_ADMIN_NAV: AdminNavItem[] = [
  { label: "Campus Intelligence", href: "/doi/dashboard", icon: "LayoutDashboard" },
  { label: "INS Form (Schedule View)", href: "/doi/ins/faculty", icon: "BookOpen" },
  { label: "Central Hub Evaluator", href: "/doi/evaluator", icon: "ClipboardList" },
  { label: "Policy reviews", href: "/doi/reviews", icon: "Scale" },
  { label: "Inbox", href: "/doi/inbox", icon: "Inbox" },
  { label: "Audit log", href: "/doi/audit-log", icon: "History" },
  { label: "Faculty Profile", href: "/doi/faculty-profile", icon: "UserCircle" },
  { label: "Subject Codes", href: "/doi/subject-codes", icon: "Layers" },
  { label: "Campus navigation", href: "/campus-navigation", icon: "MapPin" },
];
