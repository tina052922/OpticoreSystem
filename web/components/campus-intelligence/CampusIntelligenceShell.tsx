"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarPlus,
  ClipboardList,
  History,
  Inbox,
  KeyRound,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  Scale,
  Send,
  UserCircle,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { CTU_LOGO_PNG } from "@/lib/branding";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AdminNavItem, NavIconKey } from "@/lib/admin-nav";
import { isNavItemActive } from "@/lib/nav-active";
import { cn } from "@/components/ui/utils";
import { SemesterFilterProvider } from "@/contexts/SemesterFilterContext";
import { SemesterNavDropdown } from "@/components/semester/SemesterNavDropdown";
import { UserShellAvatar } from "@/components/profile/UserShellAvatar";
import { usePendingScheduleChangeRequestsCount } from "@/hooks/use-pending-schedule-change-requests-count";

const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Inbox,
  UserCircle,
  Layers,
  Send,
  MapPin,
  Scale,
  CalendarPlus,
  KeyRound,
  History,
  Megaphone,
};

/** Sidebar link that shows a numeric badge (pending schedule change requests for College Admin). */
const SCHEDULE_CHANGE_REQUESTS_HREF = "/admin/college/schedule-change-requests";

export type CampusIntelligenceShellProps = {
  children: React.ReactNode;
  userName?: string;
  /** Public URL for header avatar (from User.profileImageUrl). */
  profileImageUrl?: string | null;
  userEmail?: string;
  /** Sidebar navigation (Chairman, College, CAS, GEC, DOI). */
  navItems: AdminNavItem[];
  /** Shown above the semester chip (e.g. "College admin · CTE"). */
  roleLabel?: string;
  profileHref: string;
  /** Kept for layouts that pass it; inbox is only in the sidebar, not the avatar menu. */
  inboxHref?: string;
  /**
   * When set (College Admin layout), shows a red/orange pending count badge on
   * "Schedule change requests" and keeps it updated via Supabase Realtime + polling fallback.
   */
  scheduleChangeRequestsBadgeCollegeId?: string | null;
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
  scheduleChangeRequestsBadgeCollegeId = null,
}: CampusIntelligenceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navHrefs = navItems.map((i) => i.href);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pendingScrCount = usePendingScheduleChangeRequestsCount(scheduleChangeRequestsBadgeCollegeId);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  async function logout() {
    const supabase = createSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.refresh();
    router.replace("/login");
  }

  return (
    <SemesterFilterProvider>
      <div className="flex min-h-screen flex-col bg-[var(--color-opticore-bg)] overflow-hidden">
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CTU_LOGO_PNG}
              alt="Cebu Technological University"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-[18px] md:text-[22px] text-white truncate">OptiCore</h1>
            <p className="font-normal text-[13px] md:text-[16px] text-white truncate">
              Campus Intelligence System – CTU Argao
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
            <DropdownMenuContent align="end" className="min-w-[220px]">
              <div className="px-2 py-1.5 text-xs text-black/60 border-b border-black/10 mb-1">
                <div className="font-semibold text-black text-sm">{userName}</div>
                {userEmail ? <div className="truncate">{userEmail}</div> : null}
              </div>
              <DropdownMenuItem asChild>
                <Link href={profileHref}>Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/change-password" className="flex items-center gap-2 cursor-pointer">
                  <KeyRound className="w-4 h-4 shrink-0 text-black/70" aria-hidden />
                  Change password
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => void logout()}
                className="text-red-700 focus:text-red-800 focus:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
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
            {navItems.map((item) => {
              const active = isNavItemActive(pathname, item.href, navHrefs);
              const Icon = item.icon ? NAV_ICONS[item.icon] : undefined;
              const scrBadge =
                item.href === SCHEDULE_CHANGE_REQUESTS_HREF && pendingScrCount > 0 ? pendingScrCount : null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left min-h-[44px] ${
                    active
                      ? "bg-[#FF990A] text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.2)]"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {Icon ? <Icon className="w-5 h-5 shrink-0" /> : null}
                  <span className="font-medium text-sm truncate flex-1 min-w-0">{item.label}</span>
                  {scrBadge !== null ? (
                    <span
                      className={`shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center border ${
                        active
                          ? "bg-white text-[#780301] border-white/80"
                          : "bg-[#DE0602] text-white border-red-900/30"
                      }`}
                      title={`${scrBadge} pending request${scrBadge === 1 ? "" : "s"}`}
                      aria-label={`${scrBadge} pending schedule change requests`}
                    >
                      {scrBadge > 99 ? "99+" : scrBadge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 no-print border-t border-black/5">
            <Button variant="outline" className="w-full bg-white justify-center" onClick={() => void logout()}>
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto min-w-0 bg-[#F8F8F8]">{children}</main>
      </div>
      </div>
    </SemesterFilterProvider>
  );
}
