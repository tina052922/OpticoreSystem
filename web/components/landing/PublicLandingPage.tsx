"use client";

import Link from "next/link";
import { ArrowRight, Download, LogIn, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CTU_LOGO_PNG } from "@/lib/branding";

/**
 * Public home: unauthenticated landing — matches OptiCore red header + orange CTAs.
 */
export function PublicLandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-opticore-bg)]">
      <header
        className="w-full flex-none flex items-center justify-between px-4 md:px-10 py-4 md:py-5 shadow-[0px_4px_4px_rgba(0,0,0,0.2)]"
        style={{ background: "linear-gradient(90deg, #780301 0%, #DE0602 100%)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full overflow-hidden ring-2 ring-white/25 bg-white shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CTU_LOGO_PNG} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="text-white min-w-0">
            <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wide opacity-90">Cebu Technological University · Argao</p>
            <p className="text-lg sm:text-xl font-bold truncate">OptiCore</p>
            <p className="text-[11px] sm:text-xs opacity-85 hidden sm:block">Campus Intelligence System</p>
          </div>
        </div>
        <Button
          asChild
          className="bg-white text-[#780301] hover:bg-white/90 font-semibold shadow-md shrink-0"
        >
          <Link href="/login">
            <LogIn className="w-4 h-4 mr-2" />
            Log in
          </Link>
        </Button>
      </header>

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-center space-y-4">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-opticore-orange)]">
            <Sparkles className="w-4 h-4" />
            Smart scheduling & campus insight
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-black tracking-tight">
            Welcome to OptiCore
          </h1>
          <p className="text-base md:text-lg text-black/70 max-w-2xl mx-auto leading-relaxed">
            Coordinate timetables, faculty load, and campus workflows for CTU Argao — built for chairs, admins, faculty, and students.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-10 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-2xl bg-white border border-black/10 shadow-[0px_4px_12px_rgba(0,0,0,0.06)] p-6 md:p-8 flex flex-col">
              <div className="h-11 w-11 rounded-xl bg-[var(--color-opticore-orange)]/15 flex items-center justify-center text-[var(--color-opticore-orange)] mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-black mb-2">Campus Navigation</h2>
              <p className="text-sm text-black/65 leading-relaxed flex-1 mb-6">
                Explore buildings, offices, and key locations. Open the interactive campus map and plan your visit or class routes.
              </p>
              <Button asChild className="w-full sm:w-auto bg-[var(--color-opticore-orange)] hover:bg-[#e88909] text-white font-semibold">
                <Link href="/campus-navigation">
                  Open campus navigation
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </article>

            <article className="rounded-2xl bg-white border border-black/10 shadow-[0px_4px_12px_rgba(0,0,0,0.06)] p-6 md:p-8 flex flex-col">
              <div className="h-11 w-11 rounded-xl bg-[var(--color-opticore-orange)]/15 flex items-center justify-center text-[var(--color-opticore-orange)] mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-black mb-2">About OptiCore</h2>
              <p className="text-sm text-black/65 leading-relaxed flex-1 mb-6">
                OptiCore is CTU Argao&apos;s Campus Intelligence System: schedule plotting, INS-style forms, access workflows, and dashboards that keep academic operations transparent and aligned with institutional policy.
              </p>
              <p className="text-xs text-black/45">
                Authorized users sign in with their campus credentials to access role-specific tools.
              </p>
            </article>
          </div>

          <div className="rounded-2xl bg-white border border-black/10 shadow-[0px_4px_12px_rgba(0,0,0,0.06)] p-6 md:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h2 className="text-lg font-bold text-black mb-1">Sign in to the web app</h2>
              <p className="text-sm text-black/65">Faculty, students, and staff use the secure login to reach their dashboards.</p>
            </div>
            <Button asChild size="lg" className="bg-[#780301] hover:bg-[#5a0201] text-white font-semibold shrink-0">
              <Link href="/login">
                <LogIn className="w-4 h-4 mr-2" />
                Log in
              </Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-dashed border-[var(--color-opticore-orange)]/50 bg-[var(--color-opticore-orange)]/5 p-6 md:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <Download className="w-6 h-6 text-[var(--color-opticore-orange)] shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-black mb-1">Download / Install OptiCore</h2>
                <p className="text-sm text-black/65">
                  A mobile app and PWA install option will be available in a future release. You&apos;ll install from here when published.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" className="border-[var(--color-opticore-orange)] text-[#780301] shrink-0" disabled>
              Coming soon
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 py-6 text-center text-xs text-black/45">
        © {new Date().getFullYear()} Cebu Technological University · OptiCore Campus Intelligence System
      </footer>
    </div>
  );
}
