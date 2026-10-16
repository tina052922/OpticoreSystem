"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, Calendar, Cloud, MapPin, Menu, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CTU_LOGO_PNG } from "@/lib/branding";
import { useCampusBranding } from "@/contexts/CampusBrandingContext";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#about", label: "About" },
] as const;

const FEATURES = [
  {
    icon: Calendar,
    title: "Smart scheduling",
    desc: "Plot timetables in half-hour steps, with conflicts checked across faculty, rooms and sections as you go.",
  },
  {
    icon: Users,
    title: "Faculty load",
    desc: "Track loads, designations and advisory assignments, and generate INS-compliant forms straight from them.",
  },
  {
    icon: Cloud,
    title: "One source of truth",
    desc: "The same schedule everywhere — Chairman, GEC, College, DOI and Faculty all read the one record.",
  },
  {
    icon: BarChart3,
    title: "Campus intelligence",
    desc: "Dashboards for conflicts, room utilisation, approval status and activity across the term.",
  },
] as const;

/**
 * Public home: the page everyone sees before signing in.
 *
 * The hero photograph is bright all the way across — sky, pale building, sunlit grass — so the
 * headline sits on a gradient scrim rather than on drop shadows. Shadows were holding the old
 * layout together and they fail exactly where the image is lightest.
 */
export function PublicLandingPage() {
  const branding = useCampusBranding();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /* The bar is transparent over the photograph and solid once the page moves under it. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* A menu left open behind a navigation would cover the page it opened. */
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, [menuOpen]);

  const navSolid = scrolled || menuOpen;

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-white supports-[overflow:clip]:overflow-x-clip">
      <a
        href="#home"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[#780301] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      {/* ───────────────────────── nav ───────────────────────── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 w-full transition-colors duration-300 ${
          navSolid
            ? "border-b border-black/10 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-8"
        >
          <Link
            href="#home"
            className="flex min-w-0 items-center gap-2.5 rounded-lg outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff990a]"
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 transition-shadow sm:h-11 sm:w-11 ${
                navSolid ? "ring-black/10" : "ring-white/40 shadow-lg"
              }`}
            >
              {/* eslint-disable-next-line no-restricted-syntax -- may be an admin-uploaded remote URL */}
              <img
                src={branding.logoUrl || CTU_LOGO_PNG}
                alt=""
                width={88}
                height={88}
                className="h-full w-full scale-105 object-contain"
              />
            </span>
            <span className="min-w-0 leading-tight">
              <span
                className={`block truncate text-base font-bold tracking-tight transition-colors sm:text-lg ${
                  navSolid ? "text-[#780301]" : "text-white drop-shadow"
                }`}
              >
                {branding.headerTitle}
              </span>
              <span
                className={`hidden truncate text-[11px] font-medium transition-colors sm:block ${
                  navSolid ? "text-black/55" : "text-white/85"
                }`}
              >
                CTU Argao Campus
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={`text-sm font-medium transition-colors ${
                  navSolid ? "text-black/70 hover:text-[#780301]" : "text-white/90 hover:text-white"
                }`}
              >
                {l.label}
              </a>
            ))}
            <Button
              asChild
              size="sm"
              className="h-10 rounded-full bg-[#780301] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5a0201]"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="landing-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className={`grid h-10 w-10 place-items-center rounded-lg transition-colors md:hidden ${
              navSolid ? "text-[#780301] hover:bg-black/5" : "text-white hover:bg-white/15"
            }`}
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </nav>

        {menuOpen ? (
          <div id="landing-menu" className="border-t border-black/10 bg-white px-4 pb-4 pt-2 md:hidden">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-3 text-sm font-medium text-black/75 hover:bg-black/5"
              >
                {l.label}
              </a>
            ))}
            <Button
              asChild
              className="mt-2 h-11 w-full rounded-full bg-[#780301] font-semibold text-white hover:bg-[#5a0201]"
            >
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                Sign in
              </Link>
            </Button>
          </div>
        ) : null}
      </header>

      {/* ───────────────────────── hero ───────────────────────── */}
      <section id="home" className="relative isolate flex min-h-[100dvh] w-full items-center overflow-hidden">
        <Image
          src="/ctu-ac-bg.png"
          alt="The Science and Technology building at Cebu Technological University, Argao Campus"
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-[65%_center] sm:object-center"
        />
        {/*
          Two scrims, not one. The vertical pass keeps the bar and the scroll cue legible at the
          edges; the horizontal pass darkens only the side the text sits on, so the building stays
          visible instead of the whole photograph going flat.
        */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/25 to-black/60"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/35 to-transparent"
        />

        <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-28 sm:px-6 sm:pb-28 sm:pt-32 lg:px-8">
          <div className="max-w-2xl text-center sm:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ffc46b] sm:text-xs">
              {branding.universityName} · Argao Campus
            </p>
            <h1 className="mt-4 text-[clamp(2.75rem,8vw+0.5rem,5.5rem)] font-bold leading-[1.02] tracking-tight text-white">
              {branding.headerTitle}
            </h1>
            <p className="mt-3 text-[clamp(1.125rem,2vw+0.65rem,1.875rem)] font-semibold leading-snug text-white/95">
              Campus Intelligence System
            </p>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:mx-0 sm:mt-6 sm:text-lg">
              One place for timetables, faculty load and the approvals between them — built for the
              chairs, administrators, faculty and students of CTU Argao.
            </p>

            <div className="mx-auto mt-9 flex w-full max-w-sm flex-col gap-3 sm:mx-0 sm:max-w-none sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="group h-12 w-full justify-center rounded-full bg-[#ff990a] px-7 text-base font-semibold text-white shadow-lg transition-colors hover:bg-[#e88909] sm:w-auto"
              >
                <Link href="/register">
                  Get started
                  <ArrowRight
                    className="ml-2 h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 w-full justify-center rounded-full border-2 border-white/70 bg-white/10 px-7 text-base font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white sm:w-auto"
              >
                <Link href="/campus-navigation">
                  <MapPin className="mr-2 h-4 w-4" aria-hidden />
                  Campus navigation
                </Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-white/70">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-white underline underline-offset-4 hover:text-[#ffc46b]"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── features ───────────────────────── */}
      <section id="features" className="scroll-mt-20 bg-[#fdfbfa] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff990a]">
              What it does
            </p>
            <h2 className="mt-3 text-[clamp(1.875rem,3vw+1rem,2.75rem)] font-bold tracking-tight text-[#780301]">
              Built around how the campus actually schedules
            </h2>
            <p className="mt-4 text-base leading-relaxed text-black/65 sm:text-lg">
              Every role works from the same timetable, so a change made by a chairman is the change
              the dean, the faculty member and the student all see.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <article
                  key={f.title}
                  className="group rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(120,3,1,0.08)]"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#780301] text-white transition-colors group-hover:bg-[#ff990a]">
                    <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-bold tracking-tight text-[#780301]">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-black/60">{f.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────── about ───────────────────────── */}
      <section id="about" className="scroll-mt-20 bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#fdf6ee] to-[#fbeee9] p-6 ring-1 ring-black/[0.05] sm:p-8">
              <Image
                src="/laptopinlandingpage.png"
                alt="OptiCore scheduling and dashboard screens shown on a laptop"
                width={1200}
                height={800}
                sizes="(max-width: 1024px) 92vw, 46vw"
                className="mx-auto h-auto w-full max-w-xl object-contain"
              />
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff990a]">
              About
            </p>
            <h2 className="mt-3 text-[clamp(1.875rem,3vw+1rem,2.75rem)] font-bold tracking-tight text-[#780301]">
              A campus intelligence system, not just a timetable
            </h2>
            <p className="mt-5 text-base leading-relaxed text-black/70 sm:text-lg">
              OptiCore carries a term from first plot to published form: schedule plotting with live
              conflict checking, INS Forms 5A–5C generated from the real schedule, teaching-load
              policy with justifications, and the approval trail between chairman, dean and DOI.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Half-hour plotting with faculty, room and section conflict checks",
                "INS forms generated from the schedule, never retyped",
                "Teaching-load policy, overload justification and approval history",
              ].map((point) => (
                <li key={point} className="flex gap-3 text-sm leading-relaxed text-black/70 sm:text-base">
                  <span
                    aria-hidden
                    className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff990a]"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ───────────────────────── footer ───────────────────────── */}
      <footer className="border-t border-black/[0.08] bg-[#fdfbfa]">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-10 text-center sm:px-6 lg:flex-row lg:justify-between lg:px-8 lg:text-left">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-black/10">
              {/* eslint-disable-next-line no-restricted-syntax -- may be an admin-uploaded remote URL */}
              <img
                src={branding.logoUrl || CTU_LOGO_PNG}
                alt=""
                width={80}
                height={80}
                className="h-full w-full scale-105 object-contain"
              />
            </span>
            <span className="text-sm font-semibold text-[#780301]">{branding.headerTitle}</span>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a href="#features" className="text-sm text-black/60 hover:text-[#780301]">
              Features
            </a>
            <a href="#about" className="text-sm text-black/60 hover:text-[#780301]">
              About
            </a>
            <Link href="/campus-navigation" className="text-sm text-black/60 hover:text-[#780301]">
              Campus navigation
            </Link>
            <Link href="/login" className="text-sm text-black/60 hover:text-[#780301]">
              Sign in
            </Link>
          </nav>

          <p className="text-xs leading-relaxed text-black/45">
            © {new Date().getFullYear()} {branding.footerText}
          </p>
        </div>
      </footer>
    </div>
  );
}
