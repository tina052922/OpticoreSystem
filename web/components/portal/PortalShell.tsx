"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, LogOut, MapPin, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CTU_LOGO_PNG } from "@/lib/branding";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/components/ui/utils";
import { SemesterFilterProvider } from "@/contexts/SemesterFilterContext";
import { SemesterNavDropdown } from "@/components/semester/SemesterNavDropdown";

export type PortalNavItem = { label: string; href: string };

export type PortalShellProps = {
  children: React.ReactNode;
  userName: string;
  userEmail?: string | null;
  /** Shown under logo in sidebar */
  sidebarBadge?: string;
  navItems: PortalNavItem[];
  /** @deprecated Selection comes from {@link SemesterNavDropdown} / {@link SemesterFilterProvider}. */
  periodLabel?: string;
  profileHref?: string;
  inboxHref?: string;
};

export function PortalShell({
  children,
  userName,
  userEmail,
  sidebarBadge = "OptiCore",
  navItems,
  periodLabel: _periodLabel,
  profileHref,
  inboxHref,
}: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileNavOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
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
    <div className="flex min-h-screen flex-col bg-[#F8F8F8] overflow-hidden">
      <header
        className="h-[99px] w-full flex-none flex items-center justify-between px-4 md:px-8 no-print shrink-0 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
        style={{ background: "linear-gradient(90deg, #780301 0%, #DE0602 100%)" }}
      >
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
          <button
            type="button"
            className="lg:hidden inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
            aria-expanded={mobileNavOpen}
            aria-controls="portal-sidebar-nav"
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
              onError={(e) => {
                const el = e.currentTarget;
                if (!el.src.includes("ctulogo.svg")) el.src = "/ctulogo.svg";
              }}
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
          <div className="hidden lg:block min-w-0 max-w-[200px] xl:max-w-[280px]">
            <SemesterNavDropdown variant="header" />
          </div>
          <Link
            href="/campus-navigation"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 md:px-3 text-xs md:text-sm font-semibold text-white/95 hover:bg-white/10 transition-colors max-w-[min(100vw-12rem,200px)]"
          >
            <MapPin className="w-4 h-4 shrink-0" aria-hidden />
            <span className="truncate">Campus Navigation</span>
          </Link>
          <button type="button" className="relative p-1" aria-label="Notifications">
            <Bell className="w-6 h-6 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#FF990A] rounded-full border border-white/30" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-10 h-10 rounded-full bg-white overflow-hidden flex items-center justify-center shrink-0 shadow-sm border border-white/90 hover:brightness-95 transition-[filter]"
                aria-label="Account menu"
              >
                <User className="w-5 h-5 text-gray-600" strokeWidth={2.2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px]">
              <div className="px-2 py-1.5 text-xs text-black/60 border-b border-black/10 mb-1">
                <div className="font-semibold text-black text-sm">{userName}</div>
                {userEmail ? <div className="truncate">{userEmail}</div> : null}
              </div>
              {profileHref ? (
                <DropdownMenuItem asChild>
                  <Link href={profileHref}>Profile</Link>
                </DropdownMenuItem>
              ) : null}
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

      <div className="lg:hidden px-3 py-2 bg-[#6d0201] border-b border-black/20 no-print">
        <SemesterNavDropdown variant="header" className="!text-[13px] !py-2.5" />
      </div>

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
          id="portal-sidebar-nav"
          className={cn(
            "fixed z-50 lg:z-auto left-0 top-[147px] lg:top-0 bottom-0",
            "w-[min(90vw,320px)] max-w-[320px] lg:w-[345px] lg:max-w-[345px]",
            "bg-[#EEEEEE] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex flex-col border-r border-black/5",
            "transform transition-transform duration-200 ease-out lg:transform-none",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            "lg:static lg:flex-none",
          )}
        >
          <div className="p-2 pt-4 no-print">
            <p className="text-[11px] font-bold uppercase tracking-wide text-black/50 px-3 mb-2 truncate">
              {sidebarBadge}
            </p>
            <SemesterNavDropdown variant="sidebar" />
          </div>

          <nav className="flex-1 px-2 pb-2 space-y-1 no-print overflow-y-auto">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left font-medium text-sm min-h-[44px] ${
                    active
                      ? "bg-[#FF990A] text-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.2)]"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {item.label}
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
