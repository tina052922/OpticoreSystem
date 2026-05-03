"use client";

import Link from "next/link";
import { BarChart3, Calendar, Cloud, LogIn, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CTU_LOGO_PNG } from "@/lib/branding";

/**
 * Public home: unauthenticated landing.
 * Updated to match the Figma Landingpage layout (Home / About / Features + CTA), adapted to Next.js.
 */
export function PublicLandingPage() {
  return (
    <div className="min-h-dvh w-full max-w-[100%] bg-white overflow-x-hidden supports-[overflow:clip]:overflow-x-clip">
      <nav
        className="fixed top-0 left-0 right-0 z-50 w-full bg-white/90 backdrop-blur-sm border-b border-black/10 shadow-sm supports-[backdrop-filter]:bg-white/85"
        aria-label="Primary"
      >
        <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 min-h-[3.5rem] sm:h-[4.5rem] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2 sm:py-0">
          <Link
            href="#home"
            className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0 w-fit rounded-lg outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-opticore-orange"
          >
            <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-full overflow-hidden bg-white ring-1 ring-black/10 shrink-0 grid place-items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CTU_LOGO_PNG}
                alt="CTU logo"
                width={88}
                height={88}
                className="h-full w-full object-contain scale-105"
              />
            </div>
            <span className="font-bold text-lg sm:text-xl text-[#a30000] truncate">OptiCore</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-6 min-w-0 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-3 sm:gap-5 lg:gap-8 min-w-0 flex-1 sm:flex-initial overflow-x-auto overflow-y-hidden whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] pr-2 sm:pr-0 pb-px [&::-webkit-scrollbar]:hidden">
              <a href="#home" className="text-[#a30000] font-medium text-sm shrink-0 hover:opacity-80">
                Home
              </a>
              <a href="#about" className="text-[#a30000] text-sm shrink-0 hover:opacity-80">
                About
              </a>
              <a href="#features" className="text-[#a30000] text-sm shrink-0 hover:opacity-80">
                Features
              </a>
            </div>
            <Button
              asChild
              size="sm"
              className="shrink-0 bg-[#a30000] hover:bg-[#8b0000] text-white font-semibold rounded-full px-3 sm:px-5 h-9 sm:h-10 sm:text-sm"
            >
              <Link href="/login" className="inline-flex items-center gap-2">
                <LogIn className="w-4 h-4 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">Sign in</span>
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <section
        id="home"
        className="relative isolate w-full min-h-[100dvh] min-w-0 overflow-hidden scroll-mt-[4rem] sm:scroll-mt-[4.75rem]"
      >
        {/* Full-viewport cover background (no distortion; crops edges on aspect mismatch) */}
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-[#1a0505] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/login/campus-photo.png')" }}
          role="img"
          aria-label="Aerial photograph of Cebu Technological University Argao campus"
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[rgba(120,3,1,0.82)] via-[rgba(120,3,1,0.55)] to-[rgba(120,3,1,0.18)]"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-[100dvh] w-full flex-col justify-center px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.25rem))] sm:pt-[max(6.25rem,calc(env(safe-area-inset-top)+4.75rem))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-[min(56rem,calc(100vw-2rem))] text-center sm:mx-0 sm:max-w-none sm:text-left">
            <h1 className="text-[clamp(2.125rem,6vw+0.75rem,4.75rem)] font-bold leading-[1.08] tracking-tight text-white drop-shadow-[0_6px_4px_rgba(0,0,0,0.65)]">
              OptiCore
            </h1>
            <h2 className="mt-3 sm:mt-5 text-[clamp(1.2rem,2.8vw+0.75rem,2.5rem)] font-semibold text-white drop-shadow-md">
              Campus Intelligence System
            </h2>
            <p className="mx-auto mt-4 max-w-[min(40rem,100%)] text-sm leading-relaxed font-medium text-white/95 sm:mx-0 sm:mt-6 sm:max-w-xl sm:text-base md:max-w-2xl md:text-xl">
              Coordinate timetables, faculty load, and campus workflows for CTU Argao — built for chairs, admins, faculty,
              and students.
            </p>
            <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 min-[380px]:max-w-none min-[380px]:flex-row min-[380px]:flex-wrap sm:mx-0 sm:mt-10">
              <Button
                asChild
                size="lg"
                className="w-full min-[380px]:w-auto min-[380px]:flex-1 sm:flex-initial justify-center bg-white text-[#780301] hover:bg-white/90 font-bold rounded-full"
              >
                <Link href="/login">Get Started</Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="w-full min-[380px]:w-auto min-[380px]:flex-1 sm:flex-initial justify-center bg-[#ff990a] hover:bg-[#e88909] text-white font-semibold rounded-full border-0"
              >
                <Link href="/campus-navigation">Campus navigation</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-[4rem] sm:scroll-mt-[4.75rem] py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-14 items-center">
          <div className="order-2 lg:order-1 w-full min-w-0 flex justify-center lg:justify-start">
            <div className="w-full max-w-xl xl:max-w-none rounded-2xl overflow-hidden bg-[#faf8f6]/80 ring-1 ring-black/[0.06] shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element -- static asset from public/ */}
              <img
                src="/laptopinlandingpage.png"
                alt="OptiCore scheduling and dashboard interfaces on a laptop"
                loading="lazy"
                decoding="async"
                sizes="(max-width: 1024px) 94vw, 48vw"
                className="block mx-auto max-h-[min(560px,calc(100dvh-8rem))] w-auto max-w-full bg-transparent object-contain object-center sm:max-h-[min(520px,58dvh)] lg:max-h-[min(640px,72dvh)] h-auto"
              />
            </div>
          </div>
          <div className="order-1 lg:order-2 min-w-0">
            <h2 className="text-[clamp(1.875rem,3vw+1rem,3.125rem)] font-bold text-[#780301] mb-3 sm:mb-4">
              About Us
            </h2>
            <h3 className="text-lg sm:text-xl md:text-2xl text-[#780301] mb-4 sm:mb-6 leading-snug">
              Campus Intelligence System
            </h3>
            <p className="text-sm sm:text-base md:text-lg text-[#780301]/85 leading-relaxed">
              OptiCore is CTU Argao&apos;s Campus Intelligence System: schedule plotting, INS-style forms, access workflows,
              and dashboards that keep academic operations transparent and aligned with institutional policy.
            </p>
            <div className="mt-6 sm:mt-8">
              <Button
                type="button"
                disabled
                className="w-full min-[380px]:w-auto justify-center bg-[#a30000] text-white rounded-full px-6 py-5 sm:py-6 text-sm sm:text-base opacity-95"
              >
                Download App (coming soon)
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="scroll-mt-[4rem] sm:scroll-mt-[4.75rem] py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-50/60 to-red-50/35"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-10 px-1">
            <h2 className="text-[clamp(1.875rem,3vw+1rem,3.125rem)] font-bold text-[#780301]">
              Features
            </h2>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base md:text-lg text-[#780301]/75 max-w-2xl mx-auto leading-relaxed">
              Everything you need to manage campus operations efficiently
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {[
              {
                icon: Calendar,
                title: "Smart Scheduling",
                desc: "Plot schedules with conflict checking across faculty, rooms, and sections.",
              },
              {
                icon: Users,
                title: "Faculty Management",
                desc: "Track loads, designations, and assignments; generate INS-compliant outputs.",
              },
              {
                icon: Cloud,
                title: "Synchronization",
                desc: "Consistent schedule data across roles (Chairman, GEC, College, DOI, Faculty).",
              },
              {
                icon: BarChart3,
                title: "Dashboards",
                desc: "Campus Intelligence views for conflicts, activity, and term status.",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-red-100/90 shadow-sm min-w-0"
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#780301] flex items-center justify-center mb-4 shrink-0">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} aria-hidden />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#780301] break-words">{f.title}</h3>
                  <p className="mt-2 text-sm text-[#780301]/82 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 sm:mt-10 flex justify-center px-1">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto min-w-[12rem] justify-center bg-[#a30000] hover:bg-[#8b0000] text-white font-semibold rounded-full px-7"
            >
              <Link href="/login" className="inline-flex items-center gap-2">
                <LogIn className="w-4 h-4 shrink-0" aria-hidden />
                Sign in to continue
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10 py-6 sm:py-8 px-4 max-w-6xl mx-auto w-full text-center text-xs sm:text-sm text-black/55 leading-relaxed">
        © {new Date().getFullYear()} Cebu Technological University · OptiCore Campus Intelligence System
      </footer>
    </div>
  );
}
