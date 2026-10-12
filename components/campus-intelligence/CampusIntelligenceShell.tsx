"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, KeyRound, LogOut, MapPin, Menu, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { CTU_LOGO_PNG } from "@/lib/branding";
import { useCampusBranding } from "@/contexts/CampusBrandingContext";
import { authApi } from "@/lib/api/client";
import type { AdminNavEntry, AdminNavGroup, AdminNavItem } from "@/lib/admin-nav";
import { isNavGroup, navEntryHrefs } from "@/lib/admin-nav";
import { isNavItemActive } from "@/lib/nav-active";
import { NAV_ICONS } from "@/components/nav/nav-icons";
import { cn } from "@/components/ui/utils";
import { SemesterFilterProvider } from "@/contexts/SemesterFilterContext";
import { SystemConfigurationProvider } from "@/contexts/SystemConfigurationContext";
import { ProgramModeProvider } from "@/contexts/ProgramModeContext";
import { useOpticoreToast } from "@/components/alerts/OpticoreToastProvider";
import { SemesterNavDropdown } from "@/components/semester/SemesterNavDropdown";
import { UserShellAvatar } from "@/components/profile/UserShellAvatar";
import { usePendingPolicyReviewsCount } from "@/hooks/use-pending-policy-reviews-count";
import { useAuditLogUnreadCount } from "@/hooks/use-audit-log-unread-count";
import { usePendingInstructorRequestsCount } from "@/hooks/use-pending-instructor-requests-count";



const DOI_POLICY_REVIEWS_HREF = "/doi/reviews";
/** College Admin: same data as DOI queue, scoped by RLS to their college. */
const COLLEGE_POLICY_JUSTIFICATIONS_HREF = "/admin/college/policy-reviews";
const COLLEGE_AUDIT_LOG_HREF = "/admin/college/audit-log";
const DOI_AUDIT_LOG_HREF = "/doi/audit-log";
/** Chairman: instructor self-registrations awaiting approval. */
const CHAIRMAN_PENDING_INSTRUCTORS_HREF = "/chairman/pending-instructors";

export type CampusIntelligenceShellProps = {
  children: React.ReactNode;
  userName?: string;
  /** Public URL for header avatar (from User.profileImageUrl). */
  profileImageUrl?: string | null;
  userEmail?: string;
  /** Sidebar navigation (Chairman, College, CAS, GEC, DOI). */
  navItems: AdminNavEntry[];
  /** Shown above the semester chip (e.g. “College admin · COTE”). */
  roleLabel?: string;
  profileHref: string;
  /** Kept for layouts that pass it; inbox is only in the sidebar, not the avatar menu. */
  inboxHref?: string;
  /** DOI layout: unused for justification (record + notify only, no review queue). */
  policyReviewsBadge?: boolean;
  /**
   * College Admin: unused for justification (record + notify only, no review queue).
   */
  policyJustificationsBadgeCollegeId?: string | null;
  /**
   * Sidebar badge: audit rows newer than the last time this scope’s audit log page was opened.
   * Use `"college"` vs `"doi"` so College and DOI admins don’t share the same “last seen” timestamp.
   */
  auditLogUnreadScope?: string | null;
  /**
   * Chairman layout: badge on "Instructor Management" for self-registrations
   * awaiting approval. Scope comes from the session server-side, so this is a
   * plain on/off switch rather than a college id.
   */
  instructorRequestsBadge?: boolean;
};

/**
 * Admin chrome from Opticore-CampusIntelligence: red gradient header, gray sidebar, orange nav.
 */
export function CampusIntelligenceShell({
  children,
  userName = "Admin",
  profileImageUrl,
  userEmail,
  navItems,
  roleLabel,
  profileHref,
  policyReviewsBadge = false,
  policyJustificationsBadgeCollegeId = null,
  auditLogUnreadScope = null,
  instructorRequestsBadge = false,
}: CampusIntelligenceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const branding = useCampusBranding();
  const navHrefs = navEntryHrefs(navItems);

  /**
   * The count a page carries in the sidebar, or null when it carries none.
   *
   * Pulled out of the link markup so a group header can show the same counts while collapsed — a
   * pending justification must not be hidden just because its heading is shut.
   */
  function badgeFor(href: string): number | null {
    if (href === DOI_POLICY_REVIEWS_HREF && showDoiPolicyBadge) return pendingDoiPolicyReviews;
    if (href === COLLEGE_POLICY_JUSTIFICATIONS_HREF && showCollegePolicyBadge) {
      return pendingCollegePolicyReviews;
    }
    if ((href === COLLEGE_AUDIT_LOG_HREF || href === DOI_AUDIT_LOG_HREF) && showAuditBadge) {
      return auditUnreadCount;
    }
    if (href === CHAIRMAN_PENDING_INSTRUCTORS_HREF && pendingInstructorCount > 0) {
      return pendingInstructorCount;
    }
    return null;
  }

  function badgeLabel(href: string, badge: number): string {
    if (href === DOI_POLICY_REVIEWS_HREF || href === COLLEGE_POLICY_JUSTIFICATIONS_HREF) {
      return `${badge} recorded teaching-load justification${badge === 1 ? "" : "s"}`;
    }
    if (href === CHAIRMAN_PENDING_INSTRUCTORS_HREF) {
      return `${badge} instructor registration${badge === 1 ? "" : "s"} awaiting approval`;
    }
    return `${badge} new audit entr${badge === 1 ? "y" : "ies"} since last visit`;
  }

  /** One sidebar link. `nested` indents it under a group heading. */
  function renderNavLink(item: AdminNavItem, nested = false) {
    const active = isNavItemActive(pathname, item.href, navHrefs);
    const Icon = item.icon ? NAV_ICONS[item.icon] : undefined;
    const badge = badgeFor(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileNavOpen(false)}
        className={`flex items-center gap-3 rounded-lg transition-colors w-full text-left min-h-[44px] py-3 ${
          nested ? "pl-6 pr-4" : "px-4"
        } ${
          active
            ? "bg-[#FF990A] text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.2)]"
            : "text-gray-700 hover:bg-gray-200"
        }`}
      >
        {Icon ? <Icon className="w-5 h-5 shrink-0" /> : null}
        <span className="font-medium text-sm truncate flex-1 min-w-0">{item.label}</span>
        {badge !== null ? (
          <span
            className={`shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center border ${
              active
                ? "bg-white text-[#780301] border-white/80"
                : "bg-[#DE0602] text-white border-red-900/30"
            }`}
            title={badgeLabel(item.href, badge)}
            aria-label={badgeLabel(item.href, badge)}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </Link>
    );
  }
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pendingDoiPolicyReviews = usePendingPolicyReviewsCount({ enabled: policyReviewsBadge });
  const showDoiPolicyBadge = policyReviewsBadge && pendingDoiPolicyReviews > 0;
  const collegePolicyBadgeEnabled = Boolean(policyJustificationsBadgeCollegeId?.trim());
  const pendingCollegePolicyReviews = usePendingPolicyReviewsCount({
    enabled: collegePolicyBadgeEnabled,
    collegeId: policyJustificationsBadgeCollegeId,
  });
  const showCollegePolicyBadge = collegePolicyBadgeEnabled && pendingCollegePolicyReviews > 0;

  const auditUnreadCount = useAuditLogUnreadCount({
    enabled: Boolean(auditLogUnreadScope?.trim()),
    storageScope: auditLogUnreadScope?.trim() || "default",
  });
  const showAuditBadge = Boolean(auditLogUnreadScope?.trim()) && auditUnreadCount > 0;

  const pendingInstructorCount = usePendingInstructorRequestsCount({
    enabled: instructorRequestsBadge,
  });

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  /**
   * The shell is the scroll container; the document behind it must not scroll too. Without this a
   * stray pixel of extra height gives the page a second scrollbar and pushes the header out of view.
   */
  useEffect(() => {
    document.body.classList.add("oc-shell-scroll-lock");
    return () => document.body.classList.remove("oc-shell-scroll-lock");
  }, []);

  const toast = useOpticoreToast();

  async function logout() {
    try {
      await authApi.logout();
      toast.success("Signed out");
    } catch {
      toast.success("Signed out");
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <SystemConfigurationProvider>
    <ProgramModeProvider>
    <SemesterFilterProvider>
      <div className="flex h-[100dvh] flex-col bg-[var(--color-opticore-bg)] overflow-hidden">
      <header
        className="w-full h-[99px] flex-none flex items-center justify-between px-4 md:px-8 no-print shrink-0 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
        style={{
          background: "linear-gradient(90deg, #780301 0%, #DE0602 100%)",
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
          <button
            type="button"
            className="lg:hidden inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
            aria-expanded={mobileNavOpen}
            aria-controls="admin-sidebar-nav"
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            {mobileNavOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
          <div className="w-[52px] h-[52px] sm:w-[64px] sm:h-[64px] md:w-[70px] md:h-[70px] rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0 p-1">
            {/* eslint-disable-next-line no-restricted-syntax */}
            <img
              src={branding.logoUrl || CTU_LOGO_PNG}
              alt={branding.universityName}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-[18px] md:text-[22px] text-white truncate">{branding.headerTitle}</h1>
            <p className="font-normal text-[13px] md:text-[16px] text-white truncate">
              {branding.headerSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0 min-w-0">
          <Link
            href="/campus-navigation"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 md:px-3 text-xs md:text-sm font-semibold text-white/95 hover:bg-white/10 transition-colors max-w-[min(100vw-12rem,200px)]"
          >
            <MapPin className="w-4 h-4 shrink-0" aria-hidden />
            <span className="truncate">Campus Navigation</span>
          </Link>
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                suppressHydrationWarning
                className="w-10 h-10 rounded-full bg-white overflow-hidden flex items-center justify-center shrink-0 shadow-sm border border-white/90 hover:brightness-95 transition-[filter]"
                aria-label="Account menu"
              >
                <UserShellAvatar name={userName} imageUrl={profileImageUrl} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[264px]">
              <div className="flex items-center gap-3 px-2.5 pb-3 pt-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-black/[0.04]">
                  <UserShellAvatar name={userName} imageUrl={profileImageUrl} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold leading-tight text-black">
                    {userName}
                  </span>
                  {userEmail ? (
                    <span className="block truncate text-[11px] leading-tight text-black/50">{userEmail}</span>
                  ) : null}
                </span>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={profileHref}>
                  <UserRound aria-hidden />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/change-password">
                  <KeyRound aria-hidden />
                  Change password
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void logout()}
                className="text-red-700 focus:bg-red-50 focus:text-red-800 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-800 [&_svg]:text-red-600"
              >
                <LogOut aria-hidden />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
        <aside
          id="admin-sidebar-nav"
          className={cn(
            /* Semester / academic period: sidebar only (header duplicate removed for all roles). */
            "fixed left-0 top-[99px] bottom-0 z-50 flex flex-col border-r border-black/5 bg-[#EEEEEE] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]",
            "w-[min(90vw,320px)] max-w-[320px] lg:static lg:top-auto lg:bottom-auto lg:z-auto lg:w-[345px] lg:max-w-[345px] lg:shrink-0",
            "transform transition-transform duration-200 ease-out lg:translate-x-0",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="p-2 pt-4 no-print">
            {roleLabel ? (
              <p
                className="text-[11px] font-bold uppercase tracking-wide text-black/50 px-3 mb-2 truncate"
                title={roleLabel}
              >
                {roleLabel}
              </p>
            ) : null}
            <SemesterNavDropdown variant="sidebar" />
          </div>

          <nav className="flex-1 px-2 pb-2 space-y-1 no-print overflow-y-auto">
            {navItems.map((entry) =>
              isNavGroup(entry) ? (
                <NavGroupSection
                  key={`group:${entry.label}`}
                  group={entry}
                  pathname={pathname}
                  navHrefs={navHrefs}
                  badgeFor={badgeFor}
                  renderItem={renderNavLink}
                />
              ) : (
                renderNavLink(entry)
              ),
            )}
          </nav>

          <div className="p-3 no-print border-t border-black/5">
            <Button variant="outline" className="w-full bg-white justify-center" onClick={() => void logout()}>
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </aside>

        {/* `data-app-scroll` marks the one scroll container pages may scroll programmatically. */}
        <main
          data-app-scroll
          className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain bg-[#F8F8F8]"
        >
          {children}
        </main>
      </div>
      </div>
    </SemesterFilterProvider>
    </ProgramModeProvider>
    </SystemConfigurationProvider>
  );
}

/**
 * A collapsible heading with its pages under it.
 *
 * It opens by default when the page you are on is one of its children, so navigating never hides
 * where you are. Closing it is remembered for as long as the shell stays mounted — which is the
 * whole session, since the sidebar lives in the layout — and a child page becoming active opens it
 * again rather than leaving the highlight out of sight.
 */
function NavGroupSection({
  group,
  pathname,
  navHrefs,
  badgeFor,
  renderItem,
}: {
  group: AdminNavGroup;
  pathname: string;
  navHrefs: string[];
  badgeFor: (href: string) => number | null;
  renderItem: (item: AdminNavItem, nested?: boolean) => React.ReactNode;
}) {
  const holdsActivePage = group.items.some((item) => isNavItemActive(pathname, item.href, navHrefs));
  const [open, setOpen] = useState(holdsActivePage);

  useEffect(() => {
    if (holdsActivePage) setOpen(true);
  }, [holdsActivePage]);

  const Icon = group.icon ? NAV_ICONS[group.icon] : undefined;
  /** Counts from inside, surfaced on the heading while it is shut. */
  const hiddenBadge = open
    ? null
    : group.items.reduce<number | null>((sum, item) => {
        const badge = badgeFor(item.href);
        if (badge === null) return sum;
        return (sum ?? 0) + badge;
      }, null);

  const panelId = `nav-group-${group.label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left min-h-[44px] ${
          holdsActivePage && !open ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-200"
        }`}
      >
        {Icon ? <Icon className="w-5 h-5 shrink-0" /> : null}
        <span className="font-semibold text-sm truncate flex-1 min-w-0">{group.label}</span>
        {hiddenBadge !== null && hiddenBadge > 0 ? (
          <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center border bg-[#DE0602] text-white border-red-900/30">
            {hiddenBadge > 99 ? "99+" : hiddenBadge}
          </span>
        ) : null}
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={panelId} className="mt-1 space-y-1">
          {group.items.map((item) => renderItem(item, true))}
        </div>
      ) : null}
    </div>
  );
}
